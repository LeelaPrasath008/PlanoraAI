import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Circle,
  Lock,
  Flame,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { TimelineTask } from '../../types/event';
import { TaskScheduleDiagnostics } from '../../utils/taskScheduler';

export interface DagTreeViewProps {
  rootTasks: TimelineTask[];
  childrenByParentId: Map<string, TimelineTask[]>;
  diagnostics: TaskScheduleDiagnostics;
  selectedTaskId: string | null;
  collapsedTreeIds: Set<string>;
  onSelectTask: (taskId: string) => void;
  onToggleStatus: (taskId: string) => void;
  onToggleCollapse: (taskId: string) => void;
}

/**
 * Accessible collapsible hierarchy tree view of task dependencies.
 */
export const DagTreeView: React.FC<DagTreeViewProps> = ({
  rootTasks,
  childrenByParentId,
  diagnostics,
  selectedTaskId,
  collapsedTreeIds,
  onSelectTask,
  onToggleStatus,
  onToggleCollapse,
}) => {
  const renderTreeBranch = (
    task: TimelineTask,
    level: number,
    visited = new Set<string>()
  ): React.ReactNode => {
    if (visited.has(task.id)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(task.id);

    const children = childrenByParentId.get(task.id) || [];
    const isCollapsed = collapsedTreeIds.has(task.id);
    const isBlocked = diagnostics.blockedTaskIds.has(task.id);
    const isOverdue = diagnostics.overdueTaskIds.has(task.id);
    const isCritical = diagnostics.criticalPathIds.has(task.id);
    const isSelected = selectedTaskId === task.id;

    return (
      <div key={task.id} className="select-none">
        <div
          onClick={() => onSelectTask(task.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTask(task.id);
            }
          }}
          aria-label={`${task.title}, status ${task.status}, due ${task.dueDate}`}
          style={{ marginLeft: `${Math.min(level * 28, 168)}px` }}
          className={`group flex items-center justify-between gap-3 p-3 rounded-xl border mb-2 cursor-pointer transition-all ${
            isSelected
              ? 'bg-[#FAF7F2] border-[#1F1C18] shadow-xs'
              : isBlocked
              ? 'bg-[#A63A2B]/[0.04] border-[#A63A2B]/30 hover:border-[#A63A2B]'
              : isCritical
              ? 'bg-[#B8860B]/[0.04] border-[#B8860B]/35 hover:border-[#B8860B]'
              : 'bg-white border-[#E6DFD3] hover:border-[#1F1C18]/40'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {children.length > 0 ? (
              <button
                type="button"
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} downstream tasks for ${task.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(task.id);
                }}
                className="w-6 h-6 rounded-md hover:bg-[#E6DFD3]/60 flex items-center justify-center text-[#6E655A]"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span className="w-6 h-6 flex items-center justify-center text-[#CBD5E1]">
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(task.id);
              }}
              aria-label={`Cycle status for ${task.title}, current status ${task.status}`}
              className="shrink-0 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              {task.status === 'Done' ? (
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" aria-hidden="true" />
              ) : task.status === 'In Progress' ? (
                <Clock className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
              ) : (
                <Circle className="w-4 h-4 text-[#CBD5E1]" aria-hidden="true" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-sm font-semibold truncate ${
                    task.status === 'Done'
                      ? 'line-through text-[#94A3B8]'
                      : 'text-[#1F1C18]'
                  }`}
                >
                  {task.title}
                </span>
                {isBlocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#A63A2B]/15 text-[#F87171] text-xs font-bold uppercase">
                    <Lock className="w-3 h-3" aria-hidden="true" /> Blocked
                  </span>
                )}
                {isCritical && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#B8860B]/15 text-[#FBBF24] text-xs font-bold uppercase">
                    <Flame className="w-3 h-3" aria-hidden="true" /> Critical
                  </span>
                )}
                {isOverdue && (
                  <span className="px-2 py-0.5 rounded bg-[#A63A2B] text-white text-xs font-bold uppercase">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6E655A] truncate">
                {task.category} · Assignee: {task.assignee}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {children.length > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#F3EFE6] text-[#6E655A]">
                Unlocks {children.length} task{children.length > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs font-mono text-[#6E655A] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
              {task.dueDate}
            </span>
          </div>
        </div>

        {!isCollapsed && children.length > 0 && (
          <div className="border-l-2 border-dashed border-[#E6DFD3] ml-4 pl-1">
            {children.map((child) =>
              renderTreeBranch(child, level + 1, nextVisited)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E6DFD3]">
        <div>
          <h4 className="font-serif text-base font-bold text-[#1F1C18]">
            Hierarchical Dependency Tree
          </h4>
          <p className="text-xs text-[#6E655A]">
            Root milestones at top; indented branches show downstream tasks
            unlocked upon completion.
          </p>
        </div>
      </div>
      <div className="space-y-1">
        {rootTasks.map((root) => renderTreeBranch(root, 0))}
      </div>
    </div>
  );
};
