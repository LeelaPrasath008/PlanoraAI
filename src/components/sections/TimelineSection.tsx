import React, { useId } from 'react';
import {
  Calendar,
  Plus,
  Flag,
  LayoutGrid,
  GitBranch,
  Sliders,
} from 'lucide-react';
import { PlanoraEvent, TimelineTask, TaskPriority } from '../../types/event';
import { TaskScheduleDiagnostics } from '../../utils/taskScheduler';
import { TaskDependencyGraph } from '../TaskDependencyGraph';
import { DraggableGanttChart } from '../DraggableGanttChart';
import { TimelineAltViews } from './TimelineAltViews';

export interface TimelineSectionProps {
  activeEvent: PlanoraEvent;
  timelineView: 'gantt' | 'dependencies' | 'list' | 'calendar' | 'milestones';
  onSetTimelineView: (
    view: 'gantt' | 'dependencies' | 'list' | 'calendar' | 'milestones'
  ) => void;
  sortedTasks: TimelineTask[];
  tasksByMonth: Record<string, TimelineTask[]>;
  milestoneGroups: Record<string, TimelineTask[]>;
  taskDiagnostics: TaskScheduleDiagnostics;
  newTask: {
    title: string;
    description: string;
    dueDate: string;
    durationDays: number;
    priority: TaskPriority;
    category: string;
    assignee: string;
    dependsOnTaskId: string;
  };
  onSetNewTask: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      dueDate: string;
      durationDays: number;
      priority: TaskPriority;
      category: string;
      assignee: string;
      dependsOnTaskId: string;
    }>
  >;
  onAddTask: (e: React.FormEvent) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onSetTaskDependency: (
    taskId: string,
    dependsOnTaskId: string | undefined
  ) => void;
  onBulkUpdateTasks: (updatedTasks: TimelineTask[]) => void;
  onDeleteTask: (taskId: string) => void;
}

/**
 * Interactive Timeline, Dependency Graph, and Draggable Gantt Section
 * with `useId()` linked form labels and accessible view switchers.
 */
export const TimelineSection: React.FC<TimelineSectionProps> = React.memo(({
  activeEvent,
  timelineView,
  onSetTimelineView,
  sortedTasks,
  tasksByMonth,
  milestoneGroups,
  taskDiagnostics,
  newTask,
  onSetNewTask,
  onAddTask,
  onToggleTaskStatus,
  onSetTaskDependency,
  onBulkUpdateTasks,
  onDeleteTask,
}) => {
  const uid = useId();
  const titleInputId = `${uid}-task-title`;
  const dueDateInputId = `${uid}-task-duedate`;
  const durationInputId = `${uid}-task-duration`;
  const prioritySelectId = `${uid}-task-priority`;
  const dependsSelectId = `${uid}-task-depends`;

  const doneCount = activeEvent.tasks.filter((t) => t.status === 'Done').length;
  const inProgressCount = activeEvent.tasks.filter(
    (t) => t.status === 'In Progress'
  ).length;
  const todoCount = activeEvent.tasks.filter((t) => t.status === 'Todo').length;
  const completionPct =
    activeEvent.tasks.length > 0
      ? Math.round((doneCount / activeEvent.tasks.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Progress & View Mode Switcher */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-serif text-xl font-bold text-[#1F1C18]">
              Master Execution Timeline &amp; Critical Path
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#2E5A44]/15 text-[#34D399]">
              {completionPct}% Complete
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#6E655A]">
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-[#34D399]"
              />{' '}
              {doneCount} Done
            </span>
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-[#FBBF24]"
              />{' '}
              {inProgressCount} In Progress
            </span>
            <span className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-[#94A3B8]"
              />{' '}
              {todoCount} Todo
            </span>
            {taskDiagnostics.blockedTaskIds.size > 0 && (
              <span className="text-[#F87171] font-semibold">
                • {taskDiagnostics.blockedTaskIds.size} Blocked by Prerequisites
              </span>
            )}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div
          role="group"
          aria-label="Timeline visualization mode"
          className="inline-flex flex-wrap rounded-xl bg-[#FAF7F2] p-1 border border-[#E6DFD3]"
        >
          {(
            [
              { id: 'gantt', label: 'Draggable Gantt', icon: Sliders },
              { id: 'dependencies', label: 'Dependency Graph', icon: GitBranch },
              { id: 'list', label: 'Task List', icon: LayoutGrid },
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'milestones', label: 'Milestones', icon: Flag },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = timelineView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSetTimelineView(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[34px] ${
                  active
                    ? 'bg-[#1F1C18] text-white shadow-xs'
                    : 'text-[#6E655A] hover:text-[#1F1C18]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add New Milestone Task Form */}
      <form
        onSubmit={onAddTask}
        aria-label="Add Execution Task or Milestone"
        className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs space-y-4"
      >
        <h4 className="font-serif text-base font-bold text-[#1F1C18]">
          Add Execution Task or Milestone
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label
              htmlFor={titleInputId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Task Title
            </label>
            <input
              id={titleInputId}
              type="text"
              value={newTask.title}
              onChange={(e) =>
                onSetNewTask((p) => ({ ...p, title: e.target.value }))
              }
              required
              aria-required="true"
              placeholder="e.g., Finalize AV Rigging & Stage Lighting Plot"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={dueDateInputId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Due Date
            </label>
            <input
              id={dueDateInputId}
              type="date"
              value={newTask.dueDate}
              onChange={(e) =>
                onSetNewTask((p) => ({ ...p, dueDate: e.target.value }))
              }
              required
              aria-required="true"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-mono"
            />
          </div>
          <div>
            <label
              htmlFor={durationInputId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Duration (Days)
            </label>
            <input
              id={durationInputId}
              type="number"
              min={1}
              max={90}
              value={newTask.durationDays}
              onChange={(e) =>
                onSetNewTask((p) => ({
                  ...p,
                  durationDays: Math.max(1, Number(e.target.value) || 5),
                }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-mono"
            />
          </div>
          <div>
            <label
              htmlFor={prioritySelectId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Priority
            </label>
            <select
              id={prioritySelectId}
              value={newTask.priority}
              onChange={(e) =>
                onSetNewTask((p) => ({
                  ...p,
                  priority: e.target.value as TaskPriority,
                }))
              }
              className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <label
                htmlFor={dependsSelectId}
                className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
              >
                Prerequisite
              </label>
              <select
                id={dependsSelectId}
                value={newTask.dependsOnTaskId}
                onChange={(e) =>
                  onSetNewTask((p) => ({
                    ...p,
                    dependsOnTaskId: e.target.value,
                  }))
                }
                className="w-full px-2 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs truncate"
              >
                <option value="">None (Root)</option>
                {activeEvent.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-[#1F1C18] text-white text-xs font-semibold hover:bg-[#332E28] transition-colors inline-flex items-center gap-1 shrink-0 min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add
            </button>
          </div>
        </div>
      </form>

      {/* Main Active Timeline Sub-View */}
      {timelineView === 'gantt' && (
        <DraggableGanttChart
          tasks={activeEvent.tasks}
          eventDate={activeEvent.date}
          onUpdateTasks={onBulkUpdateTasks}
          onToggleTaskStatus={onToggleTaskStatus}
        />
      )}

      {timelineView === 'dependencies' && (
        <TaskDependencyGraph
          tasks={activeEvent.tasks}
          onToggleTaskStatus={onToggleTaskStatus}
          onSetTaskDependency={onSetTaskDependency}
          onBulkUpdateTasks={onBulkUpdateTasks}
        />
      )}

      {(timelineView === 'list' ||
        timelineView === 'calendar' ||
        timelineView === 'milestones') && (
        <TimelineAltViews
          timelineView={timelineView}
          sortedTasks={sortedTasks}
          allTasks={activeEvent.tasks}
          tasksByMonth={tasksByMonth}
          milestoneGroups={milestoneGroups}
          taskDiagnostics={taskDiagnostics}
          onToggleTaskStatus={onToggleTaskStatus}
          onSetTaskDependency={onSetTaskDependency}
          onDeleteTask={onDeleteTask}
        />
      )}
    </div>
  );
});
