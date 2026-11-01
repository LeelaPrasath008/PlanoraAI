import React, { useId } from 'react';
import {
  CheckCircle2,
  Clock,
  Circle,
  Link2,
  Unlink,
  X,
} from 'lucide-react';
import { TimelineTask } from '../../types/event';
import {
  TaskScheduleDiagnostics,
  wouldCreateDependencyCycle,
} from '../../utils/taskScheduler';

export interface DagNodeInspectorProps {
  selectedTask: TimelineTask;
  tasks: TimelineTask[];
  diagnostics: TaskScheduleDiagnostics;
  linkingSourceId: string | null;
  onToggleLinkingSource: (taskId: string) => void;
  onToggleStatus: (taskId: string) => void;
  onSetDependency: (taskId: string, dependsOnTaskId: string | undefined) => void;
  onSelectTask: (taskId: string) => void;
  onClose: () => void;
}

/**
 * Selected task dependency inspector panel with `useId()` linked labels.
 */
export const DagNodeInspector: React.FC<DagNodeInspectorProps> = ({
  selectedTask,
  tasks,
  diagnostics,
  linkingSourceId,
  onToggleLinkingSource,
  onToggleStatus,
  onSetDependency,
  onSelectTask,
  onClose,
}) => {
  const uid = useId();
  const prereqSelectId = `${uid}-prereq-select`;

  const downstreamDependents = tasks.filter(
    (t) => t.dependsOnTaskId === selectedTask.id
  );

  return (
    <div className="bg-white border border-[#1F1C18] rounded-2xl p-5 shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6DFD3]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold">
              Task Dependency Inspector
            </span>
            {diagnostics.criticalPathIds.has(selectedTask.id) && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#B8860B]/15 text-[#FBBF24] font-bold">
                Critical Path Stage
              </span>
            )}
          </div>
          <h4 className="font-serif text-lg font-bold text-[#1F1C18] mt-0.5">
            {selectedTask.title}
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleLinkingSource(selectedTask.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors min-h-[34px] ${
              linkingSourceId === selectedTask.id
                ? 'bg-[#B8860B] text-white border-[#B8860B]'
                : 'bg-[#FAF7F2] text-[#1F1C18] border-[#E6DFD3] hover:border-[#B8860B]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
            {linkingSourceId === selectedTask.id
              ? 'Select Target Node...'
              : 'Link Downstream Dependent'}
          </button>

          <button
            type="button"
            onClick={() => onToggleStatus(selectedTask.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1F1C18] text-white hover:bg-[#332E28] transition-colors min-h-[34px]"
          >
            {selectedTask.status === 'Done' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
            ) : selectedTask.status === 'In Progress' ? (
              <Clock className="w-3.5 h-3.5 text-[#FBBF24]" aria-hidden="true" />
            ) : (
              <Circle className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Status: {selectedTask.status}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close task dependency inspector"
            className="p-1.5 rounded-lg text-[#6E655A] hover:text-[#1F1C18] hover:bg-[#FAF7F2] min-w-[32px] min-h-[32px] flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upstream Prerequisite Selector */}
        <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl p-3.5">
          <label
            htmlFor={prereqSelectId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2"
          >
            Upstream Prerequisite (Must complete before this task)
          </label>
          <div className="flex items-center gap-2">
            <select
              id={prereqSelectId}
              value={selectedTask.dependsOnTaskId || ''}
              onChange={(e) =>
                onSetDependency(selectedTask.id, e.target.value || undefined)
              }
              className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#E6DFD3] text-xs text-[#1F1C18] focus:outline-none focus:border-[#22D3EE]"
            >
              <option value="">None (Independent Root Milestone)</option>
              {tasks
                .filter((t) => t.id !== selectedTask.id)
                .map((candidate) => {
                  const wouldCycle = wouldCreateDependencyCycle(
                    tasks,
                    selectedTask.id,
                    candidate.id
                  );
                  return (
                    <option
                      key={candidate.id}
                      value={candidate.id}
                      disabled={wouldCycle}
                    >
                      [{candidate.dueDate}] {candidate.title}{' '}
                      {wouldCycle ? '(Would create cycle)' : ''}
                    </option>
                  );
                })}
            </select>
            {selectedTask.dependsOnTaskId && (
              <button
                type="button"
                onClick={() => onSetDependency(selectedTask.id, undefined)}
                aria-label="Clear upstream prerequisite"
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white border border-[#E6DFD3] text-xs font-semibold text-[#F87171] hover:bg-[#A63A2B]/10"
              >
                <Unlink className="w-3.5 h-3.5" aria-hidden="true" /> Unlink
              </button>
            )}
          </div>
        </div>

        {/* Downstream Tasks Unlocked by This Task */}
        <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl p-3.5">
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#6E655A] mb-2">
            Downstream Tasks Blocked By This Milestone
          </span>
          <div className="flex flex-wrap gap-1.5">
            {downstreamDependents.map((dep) => (
              <span
                key={dep.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E6DFD3] text-xs font-medium text-[#1F1C18]"
              >
                <button
                  type="button"
                  onClick={() => onSelectTask(dep.id)}
                  className="hover:underline"
                >
                  {dep.title}
                </button>
                <button
                  type="button"
                  onClick={() => onSetDependency(dep.id, undefined)}
                  aria-label={`Remove dependency from ${dep.title}`}
                  className="text-[#94A3B8] hover:text-[#F87171]"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {downstreamDependents.length === 0 && (
              <span className="text-xs text-[#6E655A]">
                No tasks currently depend on this milestone.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
