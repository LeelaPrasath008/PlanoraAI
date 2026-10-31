import React, { useState, Suspense } from 'react';
import { motion } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  GitBranch,
  List as ListIcon,
  Network,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { PlanoraEvent, PlanoraTask } from '../../types/event';

const DraggableGanttChart = React.lazy(() =>
  import('../DraggableGanttChart').then((m) => ({
    default: m.DraggableGanttChart,
  }))
);

const TaskDependencyGraph = React.lazy(() =>
  import('../TaskDependencyGraph').then((m) => ({
    default: m.TaskDependencyGraph,
  }))
);

export type TaskViewMode =
  | 'gantt'
  | 'graph'
  | 'tree'
  | 'list'
  | 'calendar'
  | 'timeline';

interface TimelineSectionProps {
  activeEvent: PlanoraEvent;
  isReadOnly: boolean;
  ownerId: string;
  taskViewMode: TaskViewMode;
  onChangeTaskViewMode: (mode: TaskViewMode) => void;
  onRecalculateDeadlines: (newEventDate: string) => Promise<void>;
  onUpdateTask: (updated: PlanoraTask) => Promise<void>;
  onBatchUpdateTasks: (updatedList: PlanoraTask[]) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onAddTask: (task: PlanoraTask) => Promise<void>;
}

export const TimelineSection: React.FC<TimelineSectionProps> = React.memo(
  ({
    activeEvent,
    isReadOnly,
    ownerId,
    taskViewMode,
    onChangeTaskViewMode,
    onRecalculateDeadlines,
    onUpdateTask,
    onBatchUpdateTasks,
    onDeleteTask,
    onAddTask,
  }) => {
    const [taskStatusFilter, setTaskStatusFilter] = useState<string>('All');
    const [newTask, setNewTask] = useState({
      title: '',
      description: '',
      dueDate: activeEvent.eventDate,
      durationDays: '7',
      priority: 'High' as PlanoraTask['priority'],
      category: 'Venue',
      dependsOnTaskId: '',
      assignee: '',
    });

    const todayIso = new Date().toISOString().slice(0, 10);

    const handleTaskSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title.trim()) return;
      const clampedDate =
        newTask.dueDate > activeEvent.eventDate
          ? activeEvent.eventDate
          : newTask.dueDate;
      const durDays = Math.max(
        1,
        Math.min(180, Number(newTask.durationDays) || 7)
      );
      const created: PlanoraTask = {
        id: `t_man_${Date.now()}`,
        eventId: activeEvent.id,
        ownerId,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        dueDate: clampedDate,
        durationDays: durDays,
        priority: newTask.priority,
        category: newTask.category,
        status: 'Todo',
        dependsOnTaskId: newTask.dependsOnTaskId,
        assignee: newTask.assignee.trim() || 'Organizer',
      };
      await onAddTask(created);
      setNewTask({
        title: '',
        description: '',
        dueDate: activeEvent.eventDate,
        durationDays: '7',
        priority: 'High',
        category: 'Venue',
        dependsOnTaskId: '',
        assignee: '',
      });
    };

    return (
      <motion.section
        aria-label="Dynamic Timeline and Task Dependency Management"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* View Switcher & Event Date Deadline Recalculator */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
              Preparation Schedule, Draggable Gantt &amp; Dependency Graph
            </h2>
            <p className="text-xs text-slate-500">
              Drag task bars and resize handles on the Gantt timeline to adjust
              durations and dependencies, or inspect blockers in the Dependency
              Graph and Blocker Tree.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="timeline-event-date" className="text-slate-600">
                Event Date:
              </label>
              <input
                id="timeline-event-date"
                type="date"
                aria-label="Event date for recalculating deadlines"
                value={activeEvent.eventDate}
                onChange={(e) => onRecalculateDeadlines(e.target.value)}
                className="px-2.5 py-1 font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>

            <div
              role="tablist"
              aria-label="Timeline visualization modes"
              className="flex flex-wrap items-center p-1 bg-slate-100 rounded-lg gap-0.5"
            >
              {(
                [
                  {
                    id: 'gantt',
                    label: 'Draggable Gantt',
                    icon: SlidersHorizontal,
                  },
                  {
                    id: 'graph',
                    label: 'Dependency Graph',
                    icon: Network,
                  },
                  {
                    id: 'tree',
                    label: 'Blocker Tree',
                    icon: GitBranch,
                  },
                  { id: 'list', label: 'List View', icon: ListIcon },
                  {
                    id: 'calendar',
                    label: 'Calendar',
                    icon: CalendarIcon,
                  },
                  {
                    id: 'timeline',
                    label: 'Milestones',
                    icon: Clock,
                  },
                ] as const
              ).map((vm) => {
                const Icon = vm.icon;
                return (
                  <button
                    key={vm.id}
                    type="button"
                    role="tab"
                    aria-selected={taskViewMode === vm.id}
                    onClick={() => onChangeTaskViewMode(vm.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      taskViewMode === vm.id
                        ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{vm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* VIEW 0: DRAGGABLE GANTT CHART */}
        {taskViewMode === 'gantt' && (
          <Suspense
            fallback={
              <div className="bg-white border border-slate-200 rounded-xl p-6 h-80 animate-pulse space-y-3">
                <div className="h-5 w-64 bg-slate-200 rounded" />
                <div className="h-56 w-full bg-slate-100 rounded" />
              </div>
            }
          >
            <DraggableGanttChart
              tasks={activeEvent.tasks}
              eventDate={activeEvent.eventDate}
              isReadOnly={isReadOnly}
              onUpdateTask={onUpdateTask}
              onBatchUpdateTasks={onBatchUpdateTasks}
            />
          </Suspense>
        )}

        {/* VIEW 1 & 2: VISUAL DEPENDENCY GRAPH & HIERARCHICAL BLOCKER TREE */}
        {(taskViewMode === 'graph' || taskViewMode === 'tree') && (
          <Suspense
            fallback={
              <div className="bg-white border border-slate-200 rounded-xl p-6 h-80 animate-pulse space-y-3">
                <div className="h-5 w-64 bg-slate-200 rounded" />
                <div className="h-56 w-full bg-slate-100 rounded" />
              </div>
            }
          >
            <TaskDependencyGraph
              tasks={activeEvent.tasks}
              eventDate={activeEvent.eventDate}
              isReadOnly={isReadOnly}
              initialSubMode={taskViewMode === 'tree' ? 'tree' : 'graph'}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
            />
          </Suspense>
        )}

        {/* Status Filter for List / Calendar / Timeline */}
        {taskViewMode !== 'gantt' &&
          taskViewMode !== 'graph' &&
          taskViewMode !== 'tree' && (
            <div
              role="group"
              aria-label="Filter tasks by completion status"
              className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit"
            >
              {(['All', 'Todo', 'In Progress', 'Completed'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={taskStatusFilter === st}
                    onClick={() => setTaskStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      taskStatusFilter === st
                        ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                        : 'text-slate-600'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          )}

        {/* VIEW 3: LIST VIEW */}
        {taskViewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <div className="divide-y divide-slate-200">
              {activeEvent.tasks
                .filter(
                  (t) =>
                    taskStatusFilter === 'All' || t.status === taskStatusFilter
                )
                .map((task, idx) => {
                  const prereq = activeEvent.tasks.find(
                    (x) => x.id === task.dependsOnTaskId
                  );
                  const isBlocked = prereq && prereq.status !== 'Completed';
                  const isOverdue =
                    task.status !== 'Completed' && task.dueDate < todayIso;

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono tabular-nums font-semibold text-slate-900">
                            Due: {task.dueDate}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {task.durationDays || 7}d duration
                          </span>
                          {isOverdue && (
                            <span className="text-red-600 font-semibold">
                              · Overdue
                            </span>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.priority} Priority</span>
                          {task.assignee && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Assigned: {task.assignee}</span>
                            </>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-slate-900">
                          {task.title}
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-600">
                            {task.description}
                          </p>
                        )}
                        {prereq && (
                          <div
                            className={`text-xs font-medium ${
                              isBlocked ? 'text-amber-800' : 'text-emerald-700'
                            }`}
                          >
                            {isBlocked ? 'Blocked by' : 'Unlocked by'}: “
                            {prereq.title}” ({prereq.status})
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="date"
                          aria-label={`Due date for ${task.title}`}
                          value={task.dueDate}
                          max={activeEvent.eventDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val || val > activeEvent.eventDate) return;
                            onUpdateTask({ ...task, dueDate: val });
                          }}
                          className="px-2 py-1 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                        />
                        <select
                          aria-label={`Status for ${task.title}`}
                          value={task.status}
                          onChange={(e) => {
                            onUpdateTask({
                              ...task,
                              status: e.target.value as PlanoraTask['status'],
                            });
                          }}
                          className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded"
                        >
                          <option value="Todo">Todo</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          aria-label={`Delete task ${task.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* VIEW 4: CALENDAR VIEW */}
        {taskViewMode === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#1E1B4B] font-display">
              Monthly Preparation Calendar Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...activeEvent.tasks]
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22, delay: idx * 0.03 }}
                    whileHover={{ y: -2 }}
                    className="p-3.5 bg-[#FAF8F5] border border-slate-200 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="font-bold text-[#1E1B4B]">
                        {task.dueDate} ({task.durationDays || 7}d)
                      </span>
                      <span className="text-slate-500">{task.status}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">
                      {task.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {task.category} · {task.assignee || 'Unassigned'}
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}

        {/* VIEW 5: CHRONOLOGICAL TIMELINE VIEW */}
        {taskViewMode === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
          >
            <h3 className="text-sm font-bold text-[#1E1B4B] font-display">
              Chronological Dependency &amp; Milestone Timeline
            </h3>
            <div className="space-y-4">
              {[...activeEvent.tasks]
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                .map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: idx * 0.04 }}
                    className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="w-32 shrink-0 font-mono tabular-nums text-xs font-bold text-[#1E1B4B]">
                      0{idx + 1} · {task.dueDate}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {task.title}
                      </div>
                      <p className="text-xs text-slate-600">
                        {task.description}
                      </p>
                      <div className="text-xs text-slate-500">
                        Duration: {task.durationDays || 7} days · Owner:{' '}
                        {task.assignee} · Status: {task.status}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Persistent Quick-Add Task & Dependency Creator */}
        {!isReadOnly && (
          <form
            onSubmit={handleTaskSubmit}
            aria-label="Add new task milestone"
            className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-7 gap-2.5 items-center"
          >
            <input
              type="text"
              required
              aria-label="New task title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Add new task milestone..."
              className="sm:col-span-2 px-3 py-1.5 text-xs bg-[#FAF8F5] border border-slate-300 rounded-md"
            />
            <input
              type="date"
              aria-label="New task due date"
              max={activeEvent.eventDate}
              value={newTask.dueDate}
              onChange={(e) =>
                setNewTask((p) => ({ ...p, dueDate: e.target.value }))
              }
              title="Task Due Date"
              className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-[#FAF8F5] border border-slate-300 rounded-md"
            />
            <div className="flex items-center gap-1 bg-[#FAF8F5] border border-slate-300 rounded-md px-2 py-1">
              <input
                type="number"
                min={1}
                max={180}
                aria-label="New task duration in days"
                value={newTask.durationDays}
                onChange={(e) =>
                  setNewTask((p) => ({
                    ...p,
                    durationDays: e.target.value,
                  }))
                }
                title="Task Duration in Days"
                className="w-full text-xs font-mono tabular-nums bg-transparent focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 shrink-0">days</span>
            </div>
            <select
              aria-label="New task upstream prerequisite"
              value={newTask.dependsOnTaskId}
              onChange={(e) =>
                setNewTask((p) => ({
                  ...p,
                  dependsOnTaskId: e.target.value,
                }))
              }
              className="px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-slate-300 rounded-md"
            >
              <option value="">No Prerequisite (Root)</option>
              {activeEvent.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  Blocked by: {t.title.slice(0, 26)}
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label="New task assignee"
              value={newTask.assignee}
              onChange={(e) =>
                setNewTask((p) => ({
                  ...p,
                  assignee: e.target.value,
                }))
              }
              placeholder="Assignee"
              className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-slate-300 rounded-md"
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-md"
            >
              + Add Task Bar
            </motion.button>
          </form>
        )}
      </motion.section>
    );
  }
);
