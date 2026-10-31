import { PlanoraTask } from '../types/event';

export const DAY_MS = 86400000;

export interface TaskSummaryMetrics {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  daysUntilEvent: number;
  progressPct: number;
}

export interface TaskGraphAnalysis {
  taskMap: Map<string, PlanoraTask>;
  childrenMap: Map<string, PlanoraTask[]>;
  depthMap: Map<string, number>;
  maxDepth: number;
  downstreamCountMap: Map<string, number>;
  criticalPathIds: Set<string>;
  stages: PlanoraTask[][];
  stats: {
    blockedCount: number;
    readyCount: number;
    bottleneckCount: number;
    overdueCount: number;
    stageCount: number;
  };
}

export function parseDateMs(dateStr: string): number {
  const ms = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

export function formatDateYMD(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function getTaskDuration(task: Pick<PlanoraTask, 'durationDays'>): number {
  const raw = Number(task.durationDays);
  if (Number.isFinite(raw) && raw >= 1) {
    return Math.min(180, Math.round(raw));
  }
  return 7;
}

export function getTaskStartMs(
  task: Pick<PlanoraTask, 'dueDate' | 'durationDays'>
): number {
  const dueMs = parseDateMs(task.dueDate);
  const dur = getTaskDuration(task);
  return dueMs - (dur - 1) * DAY_MS;
}

/**
 * Computes summary metrics for tasks and countdown relative to eventDate.
 */
export function calculateTaskSummary(
  tasks: PlanoraTask[],
  eventDate: string,
  todayIso: string = new Date().toISOString().slice(0, 10)
): TaskSummaryMetrics {
  let completed = 0;
  let overdue = 0;

  for (const t of tasks) {
    if (t.status === 'Completed') {
      completed += 1;
    } else if (t.dueDate < todayIso) {
      overdue += 1;
    }
  }

  const eventMs = new Date(eventDate).getTime();
  const todayMs = new Date(todayIso).getTime();
  const daysUntilEvent = Number.isFinite(eventMs)
    ? Math.ceil((eventMs - todayMs) / DAY_MS)
    : 0;

  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    overdue,
    daysUntilEvent,
    progressPct: Math.round((completed / Math.max(1, tasks.length)) * 100),
  };
}

/**
 * Checks if making `targetTaskId` depend on `candidatePrereqId` would introduce a cycle.
 */
export function wouldCreateCycle(
  tasksOrMap: PlanoraTask[] | Map<string, PlanoraTask>,
  targetTaskId: string,
  candidatePrereqId: string
): boolean {
  if (!candidatePrereqId) return false;
  if (targetTaskId === candidatePrereqId) return true;

  const taskMap =
    tasksOrMap instanceof Map
      ? tasksOrMap
      : new Map(tasksOrMap.map((t) => [t.id, t]));

  let currId = candidatePrereqId;
  const visited = new Set<string>();

  while (currId) {
    if (currId === targetTaskId) return true;
    if (visited.has(currId)) break;
    visited.add(currId);
    const node = taskMap.get(currId);
    currId = node?.dependsOnTaskId || '';
  }

  return false;
}

/**
 * Computes topological depths, critical path, and stage groupings for a task list.
 */
export function analyzeTaskDependencyGraph(
  tasks: PlanoraTask[],
  todayIso: string = new Date().toISOString().slice(0, 10)
): TaskGraphAnalysis {
  const taskMap = new Map<string, PlanoraTask>();
  const childrenMap = new Map<string, PlanoraTask[]>();

  for (const t of tasks) {
    taskMap.set(t.id, t);
    childrenMap.set(t.id, []);
  }

  for (const t of tasks) {
    if (t.dependsOnTaskId && taskMap.has(t.dependsOnTaskId)) {
      const list = childrenMap.get(t.dependsOnTaskId) || [];
      list.push(t);
      childrenMap.set(t.dependsOnTaskId, list);
    }
  }

  const depthMap = new Map<string, number>();
  const computeDepth = (
    taskId: string,
    visited: Set<string> = new Set()
  ): number => {
    if (depthMap.has(taskId)) return depthMap.get(taskId)!;
    if (visited.has(taskId)) return 0;
    visited.add(taskId);
    const t = taskMap.get(taskId);
    if (!t || !t.dependsOnTaskId || !taskMap.has(t.dependsOnTaskId)) {
      depthMap.set(taskId, 0);
      return 0;
    }
    const d = 1 + computeDepth(t.dependsOnTaskId, visited);
    depthMap.set(taskId, d);
    return d;
  };

  for (const t of tasks) {
    computeDepth(t.id);
  }

  const downstreamCountMap = new Map<string, number>();
  const getTransitiveDependents = (
    taskId: string,
    visited: Set<string> = new Set()
  ): Set<string> => {
    const result = new Set<string>();
    const direct = childrenMap.get(taskId) || [];
    for (const child of direct) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        result.add(child.id);
        const sub = getTransitiveDependents(child.id, visited);
        sub.forEach((id) => result.add(id));
      }
    }
    return result;
  };

  for (const t of tasks) {
    downstreamCountMap.set(t.id, getTransitiveDependents(t.id).size);
  }

  let longestDepth = 0;
  depthMap.forEach((d) => {
    if (d > longestDepth) longestDepth = d;
  });

  const criticalPathIds = new Set<string>();
  for (const t of tasks) {
    if ((depthMap.get(t.id) || 0) === longestDepth && longestDepth > 0) {
      let curr: PlanoraTask | undefined = t;
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

  const stages: PlanoraTask[][] = Array.from(
    { length: longestDepth + 1 },
    () => []
  );
  for (const t of tasks) {
    const d = depthMap.get(t.id) || 0;
    stages[d].push(t);
  }
  stages.forEach((group) =>
    group.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  );

  let blockedCount = 0;
  let readyCount = 0;
  let bottleneckCount = 0;
  let overdueCount = 0;

  for (const t of tasks) {
    const prereq = t.dependsOnTaskId
      ? taskMap.get(t.dependsOnTaskId)
      : undefined;
    const isBlocked = Boolean(prereq && prereq.status !== 'Completed');
    const isOverdue = t.status !== 'Completed' && t.dueDate < todayIso;
    const dependents = childrenMap.get(t.id) || [];

    if (t.status !== 'Completed') {
      if (isOverdue) overdueCount += 1;
      if (isBlocked) {
        blockedCount += 1;
      } else {
        readyCount += 1;
      }
      if (dependents.length > 0) {
        bottleneckCount += 1;
      }
    }
  }

  return {
    taskMap,
    childrenMap,
    depthMap,
    maxDepth: longestDepth,
    downstreamCountMap,
    criticalPathIds,
    stages,
    stats: {
      blockedCount,
      readyCount,
      bottleneckCount,
      overdueCount,
      stageCount: longestDepth + 1,
    },
  };
}

/**
 * Shifts all task deadlines proportionally when the target event date changes,
 * clamping deadlines so no task falls after the new event date.
 */
export function recalculateTaskDeadlines(
  tasks: PlanoraTask[],
  oldEventDate: string,
  newEventDate: string
): PlanoraTask[] {
  const oldMs = new Date(oldEventDate).getTime();
  const newMs = new Date(newEventDate).getTime();
  const diffDays =
    Number.isFinite(oldMs) && Number.isFinite(newMs)
      ? Math.round((newMs - oldMs) / DAY_MS)
      : 0;

  return tasks.map((t) => {
    const tMs = new Date(t.dueDate).getTime();
    if (!Number.isFinite(tMs)) {
      return { ...t, dueDate: newEventDate };
    }
    const shifted = new Date(tMs + diffDays * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const clamped = shifted > newEventDate ? newEventDate : shifted;
    return { ...t, dueDate: clamped };
  });
}

/**
 * Cascades and resolves schedule overlaps where a dependent task starts before its prerequisite finishes.
 */
export function resolveScheduleOverlaps(
  tasks: PlanoraTask[],
  eventDate: string
): { updatedTasks: PlanoraTask[]; cascadedCount: number } {
  const eventMaxMs = parseDateMs(eventDate);
  const taskMap = new Map<string, PlanoraTask>();
  tasks.forEach((t) => taskMap.set(t.id, { ...t }));

  let cascadedCount = 0;

  for (let pass = 0; pass < tasks.length; pass++) {
    let changedInPass = false;
    for (const candidate of taskMap.values()) {
      if (!candidate.dependsOnTaskId) continue;
      const parent = taskMap.get(candidate.dependsOnTaskId);
      if (!parent) continue;

      const parentDueMs = parseDateMs(parent.dueDate);
      const candDuration = getTaskDuration(candidate);
      const candStartMs = getTaskStartMs(candidate);

      if (candStartMs < parentDueMs) {
        const desiredStartMs = parentDueMs + DAY_MS;
        const desiredDueMs = Math.min(
          eventMaxMs,
          desiredStartMs + (candDuration - 1) * DAY_MS
        );
        const newDueStr = formatDateYMD(desiredDueMs);
        if (newDueStr !== candidate.dueDate) {
          taskMap.set(candidate.id, {
            ...candidate,
            dueDate: newDueStr,
            durationDays: candDuration,
          });
          changedInPass = true;
          cascadedCount += 1;
        }
      }
    }
    if (!changedInPass) break;
  }

  return {
    updatedTasks: Array.from(taskMap.values()),
    cascadedCount,
  };
}
