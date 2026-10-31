import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTaskSummary,
  wouldCreateCycle,
  analyzeTaskDependencyGraph,
  recalculateTaskDeadlines,
  resolveScheduleOverlaps,
} from '../utils/taskScheduler';
import { PlanoraTask } from '../types/event';

const SAMPLE_TASKS: PlanoraTask[] = [
  {
    id: 'task_1',
    eventId: 'evt_1',
    ownerId: 'u_1',
    title: 'Book Main Venue Hall',
    description: 'Sign venue contract',
    category: 'Venue',
    dueDate: '2026-10-10',
    durationDays: 5,
    priority: 'High',
    status: 'Completed',
    assignee: 'Aarav',
    dependsOnTaskId: '',
  },
  {
    id: 'task_2',
    eventId: 'evt_1',
    ownerId: 'u_1',
    title: 'Finalize Catering Menu',
    description: 'Select live counters',
    category: 'Catering',
    dueDate: '2026-10-15',
    durationDays: 4,
    priority: 'High',
    status: 'In Progress',
    assignee: 'Meera',
    dependsOnTaskId: 'task_1',
  },
  {
    id: 'task_3',
    eventId: 'evt_1',
    ownerId: 'u_1',
    title: 'Lock Floral Stage Blueprint',
    description: 'Requires catering layout first',
    category: 'Decor',
    dueDate: '2026-10-12', // Intentionally overlapping with task_2 due date (2026-10-15)
    durationDays: 3,
    priority: 'Medium',
    status: 'Todo',
    assignee: 'Kabir',
    dependsOnTaskId: 'task_2',
  },
];

describe('Task Scheduler & DAG Dependency Graph Engine', () => {
  it('computes task summary metrics accurately including pending and overdue counts', () => {
    const summary = calculateTaskSummary(
      SAMPLE_TASKS,
      '2026-10-25',
      '2026-10-14'
    );
    assert.equal(summary.total, 3);
    assert.equal(summary.completed, 1);
    assert.equal(summary.pending, 2);
    assert.equal(summary.overdue, 1); // task_3 due 2026-10-12 < 2026-10-14
    assert.equal(summary.progressPct, 33);
  });

  it('detects direct and transitive circular dependencies via wouldCreateCycle', () => {
    assert.equal(wouldCreateCycle(SAMPLE_TASKS, 'task_1', 'task_1'), true);
    assert.equal(wouldCreateCycle(SAMPLE_TASKS, 'task_1', 'task_2'), true);
    assert.equal(wouldCreateCycle(SAMPLE_TASKS, 'task_1', 'task_3'), true);
    assert.equal(wouldCreateCycle(SAMPLE_TASKS, 'task_3', 'task_1'), false);
  });

  it('computes topological stages, critical path, and downstream counts', () => {
    const graph = analyzeTaskDependencyGraph(SAMPLE_TASKS, '2026-10-01');
    assert.equal(graph.maxDepth, 2);
    assert.equal(graph.stages.length, 3);
    assert.equal(graph.downstreamCountMap.get('task_1'), 2);
    assert.equal(graph.downstreamCountMap.get('task_2'), 1);
    assert.equal(graph.downstreamCountMap.get('task_3'), 0);
    assert.equal(graph.stats.blockedCount, 1);
    assert.ok(graph.criticalPathIds.has('task_1'));
    assert.ok(graph.criticalPathIds.has('task_2'));
    assert.ok(graph.criticalPathIds.has('task_3'));
  });

  it('resolves schedule overlaps by shifting downstream dependent tasks after prerequisites', () => {
    const { updatedTasks, cascadedCount } = resolveScheduleOverlaps(
      SAMPLE_TASKS,
      '2026-11-01'
    );
    assert.ok(cascadedCount >= 1);
    const updatedTask3 = updatedTasks.find((t) => t.id === 'task_3')!;
    assert.ok(updatedTask3.dueDate > '2026-10-15');
  });

  it('recalculates task deadlines proportionally when the event date shifts', () => {
    const recalced = recalculateTaskDeadlines(
      SAMPLE_TASKS,
      '2026-10-20',
      '2026-10-30'
    );
    assert.equal(recalced.length, 3);
    assert.equal(recalced[0].dueDate, '2026-10-20'); // shifted +10 days from 2026-10-10
    assert.equal(recalced[1].dueDate, '2026-10-25'); // shifted +10 days from 2026-10-15
  });
});
