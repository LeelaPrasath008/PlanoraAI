import React from 'react';
import {
  CheckCircle2,
  Clock,
  Circle,
  Calendar,
  Trash2,
  Lock,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { TimelineTask } from '../../types/event';
import {
  TaskScheduleDiagnostics,
  wouldCreateDependencyCycle,
} from '../../utils/taskScheduler';

export interface TimelineAltViewsProps {
  timelineView: 'list' | 'calendar' | 'milestones';
  sortedTasks: TimelineTask[];
  allTasks: TimelineTask[];
  tasksByMonth: Record<string, TimelineTask[]>;
  milestoneGroups: Record<string, TimelineTask[]>;
  taskDiagnostics: TaskScheduleDiagnostics;
  onToggleTaskStatus: (taskId: string) => void;
  onSetTaskDependency: (
    taskId: string,
    dependsOnTaskId: string | undefined
  ) => void;
  onDeleteTask: (taskId: string) => void;
}

/**
 * Renders the Calendar, Milestones, and List sub-views for the TimelineSection
 * with accessible controls and >=12px text.
 */
export const TimelineAltViews: React.FC<TimelineAltViewsProps> = ({
  timelineView,
  sortedTasks,
  allTasks,
  tasksByMonth,
  milestoneGroups,
  taskDiagnostics,
  onToggleTaskStatus,
  onSetTaskDependency,
  onDeleteTask,
}) => {
  if (timelineView === 'calendar') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(tasksByMonth).map(([month, monthTasks]) => (
          <div
            key={month}
            className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6DFD3]">
              <h4 className="font-serif text-base font-bold text-[#1F1C18] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#B8860B]" aria-hidden="true" />
                {month}
              </h4>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#F3EFE6] text-[#6E655A]">
                {monthTasks.length} tasks
              </span>
            </div>

            <div className="space-y-2.5">
              {monthTasks.map((task) => {
                const isBlocked = taskDiagnostics.blockedTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-colors ${
                      task.status === 'Done'
                        ? 'bg-[#FAF7F2]/60 border-[#E6DFD3] opacity-75'
                        : isBlocked
                        ? 'bg-[#A63A2B]/[0.04] border-[#A63A2B]/30'
                        : 'bg-[#FAF7F2] border-[#E6DFD3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleTaskStatus(task.id)}
                        className="flex items-start gap-2 text-left"
                      >
                        {task.status === 'Done' ? (
                          <CheckCircle2
                            className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : task.status === 'In Progress' ? (
                          <Clock
                            className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        )}
                        <div>
                          <p
                            className={`text-xs font-semibold ${
                              task.status === 'Done'
                                ? 'line-through text-[#94A3B8]'
                                : 'text-[#1F1C18]'
                            }`}
                          >
                            {task.title}
                          </p>
                          <span className="text-xs font-mono text-[#6E655A]">
                            Due {task.dueDate} · {task.category}
                          </span>
                        </div>
                      </button>
                      {isBlocked && (
                        <span className="px-1.5 py-0.5 rounded bg-[#A63A2B]/15 text-[#F87171] text-xs font-bold uppercase shrink-0">
                          Blocked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (timelineView === 'milestones') {
    return (
      <div className="space-y-4">
        {Object.entries(milestoneGroups).map(([phaseName, phaseTasks]) => (
          <div
            key={phaseName}
            className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3">
              <h4 className="font-serif text-lg font-bold text-[#1F1C18]">
                {phaseName}
              </h4>
              <span className="text-xs font-mono text-[#6E655A]">
                {phaseTasks.filter((t) => t.status === 'Done').length} /{' '}
                {phaseTasks.length} Done
              </span>
            </div>

            {phaseTasks.length === 0 ? (
              <p className="text-xs text-[#6E655A] italic">
                No tasks scheduled in this countdown window.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {phaseTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task.id)}
                      className="flex items-center gap-2.5 text-left min-w-0"
                    >
                      {task.status === 'Done' ? (
                        <CheckCircle2
                          className="w-4 h-4 text-[#34D399] shrink-0"
                          aria-hidden="true"
                        />
                      ) : task.status === 'In Progress' ? (
                        <Clock
                          className="w-4 h-4 text-[#FBBF24] shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="w-4 h-4 text-[#CBD5E1] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1F1C18] truncate">
                          {task.title}
                        </p>
                        <span className="text-xs font-mono text-[#6E655A]">
                          {task.dueDate} · {task.assignee}
                        </span>
                      </div>
                    </button>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                        task.priority === 'High'
                          ? 'bg-[#A63A2B]/15 text-[#F87171]'
                          : task.priority === 'Medium'
                          ? 'bg-[#B8860B]/15 text-[#FBBF24]'
                          : 'bg-[#E6DFD3]/20 text-[#CBD5E1]'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6DFD3] rounded-2xl shadow-xs divide-y divide-[#E6DFD3]">
      {sortedTasks.map((task) => {
        const isBlocked = taskDiagnostics.blockedTaskIds.has(task.id);
        const isOverdue = taskDiagnostics.overdueTaskIds.has(task.id);
        const isCritical = taskDiagnostics.criticalPathIds.has(task.id);
        const isConflict = taskDiagnostics.scheduleConflictIds.has(task.id);

        return (
          <div
            key={task.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF7F2]/60 transition-colors"
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onToggleTaskStatus(task.id)}
                aria-label={`Cycle status for ${task.title}, current status ${task.status}`}
                className="mt-0.5 shrink-0 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
              >
                {task.status === 'Done' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#34D399]" aria-hidden="true" />
                ) : task.status === 'In Progress' ? (
                  <Clock className="w-5 h-5 text-[#FBBF24]" aria-hidden="true" />
                ) : (
                  <Circle className="w-5 h-5 text-[#CBD5E1]" aria-hidden="true" />
                )}
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      task.status === 'Done'
                        ? 'line-through text-[#94A3B8]'
                        : 'text-[#1F1C18]'
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#F3EFE6] text-[#6E655A]">
                    {task.category}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      task.priority === 'High'
                        ? 'bg-[#A63A2B]/15 text-[#F87171]'
                        : task.priority === 'Medium'
                        ? 'bg-[#B8860B]/15 text-[#FBBF24]'
                        : 'bg-[#E6DFD3]/20 text-[#CBD5E1]'
                    }`}
                  >
                    {task.priority}
                  </span>
                  {isBlocked && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-[#A63A2B]/15 text-[#F87171]">
                      <Lock className="w-3 h-3" aria-hidden="true" /> Blocked
                    </span>
                  )}
                  {isCritical && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-[#B8860B]/15 text-[#FBBF24]">
                      <Flame className="w-3 h-3" aria-hidden="true" /> Critical Path
                    </span>
                  )}
                  {isOverdue && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#A63A2B] text-white">
                      Overdue
                    </span>
                  )}
                  {isConflict && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-[#D97706]/15 text-[#FBBF24]">
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Date Overlap
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-[#6E655A] mt-1">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
              <select
                aria-label={`Prerequisite task for ${task.title}`}
                value={task.dependsOnTaskId || ''}
                onChange={(e) =>
                  onSetTaskDependency(task.id, e.target.value || undefined)
                }
                className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] text-xs text-[#6E655A] max-w-[180px]"
              >
                <option value="">No Prerequisite</option>
                {allTasks
                  .filter((candidate) => candidate.id !== task.id)
                  .map((candidate) => (
                    <option
                      key={candidate.id}
                      value={candidate.id}
                      disabled={wouldCreateDependencyCycle(
                        allTasks,
                        task.id,
                        candidate.id
                      )}
                    >
                      Depends on: {candidate.title}
                    </option>
                  ))}
              </select>

              <span className="font-mono text-xs text-[#1F1C18] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E6DFD3]">
                Due {task.dueDate}
              </span>

              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                aria-label={`Delete task ${task.title}`}
                className="p-2 rounded-lg text-[#CBD5E1] hover:text-[#F87171] hover:bg-[#A63A2B]/10 transition-colors min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
