import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTaskSchedule,
  wouldCreateDependencyCycle,
  autoResolveScheduleConflicts,
  inferLogicalDependencies,
} from '../utils/taskScheduler';
import {
  parseIsoDay,
  formatIsoDay,
  addDaysIso,
  computeTaskWindow,
} from '../utils/ganttMath';
import { TimelineTask } from '../types/event';

const SAMPLE_TASKS: TimelineTask[] = [
  {
    id: 't1',
    title: 'Lock Venue Contract',
    description: '',
    dueDate: '2026-05-01',
    priority: 'High',
    category: 'Venue',
    status: 'In Progress',
    assignee: 'Lead',
  },
  {
    id: 't2',
    title: 'Confirm Catering Menu',
    description: '',
    dueDate: '2026-04-20', // Intentionally earlier than prerequisite t1 to trigger conflict
    priority: 'High',
    category: 'Catering',
    status: 'Todo',
    assignee: 'Lead',
    dependsOnTaskId: 't1',
  },
  {
    id: 't3',
    title: 'Send Invitations',
    description: '',
    dueDate: '2026-06-01',
    priority: 'Medium',
    category: 'Guests',
    status: 'Todo',
    assignee: 'Coordinator',
    dependsOnTaskId: 't2',
  },
];

describe('Task Dependency Scheduler, Cycle Detection & Gantt Math Tests', () => {
  it('handles empty task lists cleanly', () => {
    const diag = analyzeTaskSchedule([], '2026-05-10');
    assert.equal(diag.topologicalOrder.length, 0);
    assert.equal(diag.criticalPathIds.size, 0);
    assert.equal(inferLogicalDependencies([]).length, 0);
  });

  it('detects blocked tasks, overdue tasks, schedule conflicts, and critical path', () => {
    const diag = analyzeTaskSchedule(SAMPLE_TASKS, '2026-05-10');

    assert.equal(diag.blockedTaskIds.has('t2'), true);
    assert.equal(diag.scheduleConflictIds.has('t2'), true);
    assert.equal(diag.overdueTaskIds.has('t1'), true);
    assert.equal(diag.overdueTaskIds.has('t2'), true);
    assert.equal(diag.overdueTaskIds.has('t3'), false);

    assert.equal(diag.criticalPathIds.has('t1'), true);
    assert.equal(diag.criticalPathIds.has('t2'), true);
    assert.equal(diag.criticalPathIds.has('t3'), true);
  });

  it('prevents circular dependencies (self-dependency, 2-node, and transitive cycles) and detects existing cycles', () => {
    assert.equal(wouldCreateDependencyCycle(SAMPLE_TASKS, 't1', 't1'), true);
    assert.equal(wouldCreateDependencyCycle(SAMPLE_TASKS, 't1', 't3'), true);
    assert.equal(wouldCreateDependencyCycle(SAMPLE_TASKS, 't3', 't1'), false);

    // Pre-existing cyclic data should not infinite-loop analyzeTaskSchedule
    const cyclicTasks: TimelineTask[] = [
      { ...SAMPLE_TASKS[0], id: 'c1', dependsOnTaskId: 'c2' },
      { ...SAMPLE_TASKS[1], id: 'c2', dependsOnTaskId: 'c1' },
    ];
    const cyclicDiag = analyzeTaskSchedule(cyclicTasks, '2026-05-10');
    assert.equal(cyclicDiag.cycleDetectedIds.size > 0, true);
  });

  it('auto-resolves schedule conflicts by shifting dependent tasks forward', () => {
    const { updatedTasks, adjustedCount } = autoResolveScheduleConflicts(
      SAMPLE_TASKS,
      4
    );
    assert.equal(adjustedCount, 1);

    const t2 = updatedTasks.find((t) => t.id === 't2')!;
    assert.equal(t2.dueDate, '2026-05-05');

    const postDiag = analyzeTaskSchedule(updatedTasks, '2026-04-01');
    assert.equal(postDiag.scheduleConflictIds.size, 0);
  });

  it('infers logical dependencies when tasks have no links', () => {
    const unlinked = SAMPLE_TASKS.map((t) => ({ ...t, dependsOnTaskId: undefined }));
    const inferred = inferLogicalDependencies(unlinked);
    const linkedCount = inferred.filter((t) => Boolean(t.dependsOnTaskId)).length;
    assert.equal(linkedCount, 2);
  });

  it('computes accurate Gantt start/end windows and date arithmetic', () => {
    const ms = parseIsoDay('2026-09-10');
    assert.equal(formatIsoDay(ms), '2026-09-10');
    assert.equal(addDaysIso('2026-09-10', 5), '2026-09-15');
    assert.equal(addDaysIso('2026-09-10', -3), '2026-09-07');

    const window = computeTaskWindow(
      { ...SAMPLE_TASKS[0], dueDate: '2026-05-10', durationDays: 5 },
      '2026-06-01'
    );
    assert.equal(window.endIso, '2026-05-10');
    assert.equal(window.startIso, '2026-05-06');
    assert.equal(window.durationDays, 5);
  });
});
