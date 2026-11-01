import { TimelineTask } from '../types/event';

export interface TaskScheduleDiagnostics {
  overdueTaskIds: Set<string>;
  blockedTaskIds: Set<string>;
  scheduleConflictIds: Set<string>;
  criticalPathIds: Set<string>;
  topologicalOrder: string[];
  dependencyDepthMap: Map<string, number>;
  dependentCountMap: Map<string, number>;
  cycleDetectedIds: Set<string>;
}

function parseIsoDate(dateStr: string): number | null {
  if (!dateStr) return null;
  const time = Date.parse(`${dateStr}T00:00:00`);
  return Number.isNaN(time) ? null : time;
}

function formatIsoDate(timestampMs: number): string {
  const d = new Date(timestampMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Analyzes task dependencies, detects cycles, computes critical-path chains,
 * and flags overdue, blocked, or schedule-overlapping tasks.
 * @param tasks Array of `TimelineTask` items.
 * @param referenceTodayIso Optional ISO date (`YYYY-MM-DD`) used as the reference "today".
 * @returns `TaskScheduleDiagnostics` containing sets and maps of task IDs.
 */
export function analyzeTaskSchedule(
  tasks: TimelineTask[],
  referenceTodayIso?: string
): TaskScheduleDiagnostics {
  const todayStr =
    referenceTodayIso || new Date().toISOString().split('T')[0];
  const todayMs = parseIsoDate(todayStr) ?? Date.now();

  const taskMap = new Map<string, TimelineTask>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  const overdueTaskIds = new Set<string>();
  const blockedTaskIds = new Set<string>();
  const scheduleConflictIds = new Set<string>();
  const cycleDetectedIds = new Set<string>();
  const dependentCountMap = new Map<string, number>();
  const dependencyDepthMap = new Map<string, number>();

  for (const t of tasks) {
    dependentCountMap.set(t.id, 0);
  }

  for (const t of tasks) {
    const dueMs = parseIsoDate(t.dueDate);
    if (t.status !== 'Done' && dueMs !== null && dueMs < todayMs) {
      overdueTaskIds.add(t.id);
    }

    if (t.dependsOnTaskId && taskMap.has(t.dependsOnTaskId)) {
      const parent = taskMap.get(t.dependsOnTaskId)!;
      dependentCountMap.set(
        parent.id,
        (dependentCountMap.get(parent.id) || 0) + 1
      );

      if (parent.status !== 'Done' && t.status !== 'Done') {
        blockedTaskIds.add(t.id);
      }

      const parentDueMs = parseIsoDate(parent.dueDate);
      if (dueMs !== null && parentDueMs !== null && dueMs < parentDueMs) {
        scheduleConflictIds.add(t.id);
      }
    }
  }

  const visiting = new Set<string>();
  const memoDepth = new Map<string, number>();

  function computeDepth(id: string): number {
    if (memoDepth.has(id)) return memoDepth.get(id)!;
    if (visiting.has(id)) {
      cycleDetectedIds.add(id);
      return 0;
    }
    visiting.add(id);
    const task = taskMap.get(id);
    let depth = 0;
    if (
      task?.dependsOnTaskId &&
      taskMap.has(task.dependsOnTaskId) &&
      task.dependsOnTaskId !== id
    ) {
      depth = 1 + computeDepth(task.dependsOnTaskId);
    }
    visiting.delete(id);
    memoDepth.set(id, depth);
    return depth;
  }

  let maxChainDepth = 0;
  for (const t of tasks) {
    const d = computeDepth(t.id);
    dependencyDepthMap.set(t.id, d);
    if (d > maxChainDepth) {
      maxChainDepth = d;
    }
  }

  const criticalPathIds = new Set<string>();
  if (maxChainDepth > 0) {
    for (const t of tasks) {
      if ((dependencyDepthMap.get(t.id) || 0) === maxChainDepth) {
        let curr: TimelineTask | undefined = t;
        const seen = new Set<string>();
        while (curr && !seen.has(curr.id)) {
          seen.add(curr.id);
          criticalPathIds.add(curr.id);
          curr = curr.dependsOnTaskId
            ? taskMap.get(curr.dependsOnTaskId)
            : undefined;
        }
      }
    }
  } else {
    for (const t of tasks) {
      if (t.priority === 'High' && t.status !== 'Done') {
        criticalPathIds.add(t.id);
      }
    }
  }

  const topologicalOrder = [...tasks]
    .sort((a, b) => {
      const depthDiff =
        (dependencyDepthMap.get(a.id) || 0) -
        (dependencyDepthMap.get(b.id) || 0);
      if (depthDiff !== 0) return depthDiff;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .map((t) => t.id);

  return {
    overdueTaskIds,
    blockedTaskIds,
    scheduleConflictIds,
    criticalPathIds,
    topologicalOrder,
    dependencyDepthMap,
    dependentCountMap,
    cycleDetectedIds,
  };
}

/**
 * Checks whether setting `taskId.dependsOnTaskId = candidateParentId` would create a cycle.
 * @param tasks Current task list.
 * @param taskId Child task ID.
 * @param candidateParentId Proposed prerequisite task ID.
 * @returns `true` if linking would create a circular dependency.
 */
export function wouldCreateDependencyCycle(
  tasks: TimelineTask[],
  taskId: string,
  candidateParentId: string | undefined
): boolean {
  if (!candidateParentId) return false;
  if (taskId === candidateParentId) return true;

  const taskMap = new Map<string, TimelineTask>(tasks.map((t) => [t.id, t]));
  let cursorId: string | undefined = candidateParentId;
  const visited = new Set<string>([taskId]);

  while (cursorId) {
    if (visited.has(cursorId)) {
      return true;
    }
    visited.add(cursorId);
    const cursorTask = taskMap.get(cursorId);
    cursorId = cursorTask?.dependsOnTaskId;
  }

  return false;
}

/**
 * Automatically shifts dependent tasks forward so every dependent task due date
 * occurs at least `minBufferDays` after its prerequisite's due date.
 * @param tasks Current task list.
 * @param minBufferDays Minimum days between prerequisite due date and dependent due date.
 * @returns Updated task array and count of adjusted tasks.
 */
export function autoResolveScheduleConflicts(
  tasks: TimelineTask[],
  minBufferDays = 3
): { updatedTasks: TimelineTask[]; adjustedCount: number } {
  const cloned = tasks.map((t) => ({ ...t }));
  const taskMap = new Map<string, TimelineTask>(cloned.map((t) => [t.id, t]));
  const diagnostics = analyzeTaskSchedule(cloned);

  let adjustedCount = 0;
  const dayMs = 24 * 60 * 60 * 1000;

  for (const id of diagnostics.topologicalOrder) {
    const task = taskMap.get(id);
    if (!task || !task.dependsOnTaskId) continue;
    const parent = taskMap.get(task.dependsOnTaskId);
    if (!parent) continue;

    const parentMs = parseIsoDate(parent.dueDate);
    const taskMs = parseIsoDate(task.dueDate);
    if (parentMs !== null && taskMs !== null && taskMs < parentMs) {
      const shiftedMs = parentMs + Math.max(1, minBufferDays) * dayMs;
      task.dueDate = formatIsoDate(shiftedMs);
      adjustedCount += 1;
    }
  }

  return { updatedTasks: cloned, adjustedCount };
}

/**
 * Infers logical prerequisite task chains based on due date ordering when tasks lack explicit dependencies.
 * @param tasks Current task list.
 * @returns Task list with inferred `dependsOnTaskId` links.
 */
export function inferLogicalDependencies(tasks: TimelineTask[]): TimelineTask[] {
  if (tasks.length <= 1) return tasks;
  const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const idToInferredParent = new Map<string, string>();

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current.dependsOnTaskId) continue;
    const prev = sorted[i - 1];
    if (prev && prev.id !== current.id) {
      idToInferredParent.set(current.id, prev.id);
    }
  }

  return tasks.map((t) =>
    t.dependsOnTaskId
      ? t
      : {
          ...t,
          dependsOnTaskId: idToInferredParent.get(t.id),
        }
  );
}
