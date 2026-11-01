import React, { useId } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Circle,
  Unlink,
  X,
} from 'lucide-react';
import { TimelineTask } from '../../types/event';
import { TaskScheduleDiagnostics, wouldCreateDependencyCycle } from '../../utils/taskScheduler';
import { TaskWindow, addDaysIso } from '../../utils/ganttMath';

export interface GanttInspectorProps {
  selectedWindow: TaskWindow;
  allWindows: TaskWindow[];
  tasks: TimelineTask[];
  diagnostics: TaskScheduleDiagnostics;
  eventDate: string;
  onToggleTaskStatus: (taskId: string) => void;
  onUpdateDuration: (taskId: string, durationDays: number) => void;
  onUpdateDueDate: (taskId: string, dueDate: string) => void;
  onUpdateDependency: (taskId: string, parentId: string | undefined) => void;
  onClose: () => void;
}

/**
 * Precision inspector panel for the currently selected Gantt task bar,
 * with linked `<label htmlFor>` + `id` on all form controls.
 */
export const GanttInspector: React.FC<GanttInspectorProps> = ({
  selectedWindow,
  allWindows,
  tasks,
  diagnostics,
  eventDate,
  onToggleTaskStatus,
  onUpdateDuration,
  onUpdateDueDate,
  onUpdateDependency,
  onClose,
}) => {
  const uid = useId();
  const durationInputId = `${uid}-duration`;
  const dueDateInputId = `${uid}-duedate`;
  const dependencySelectId = `${uid}-dependency`;

  const selectedTask = selectedWindow.task;

  return (
    <div className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      <div className="space-y-1 max-w-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-[#F3EFE6] text-[#6E655A] font-semibold">
            {selectedTask.category}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              selectedTask.priority === 'High'
                ? 'bg-[#A63A2B]/15 text-[#F87171]'
                : selectedTask.priority === 'Medium'
                ? 'bg-[#B8860B]/15 text-[#FBBF24]'
                : 'bg-[#E6DFD3]/20 text-[#CBD5E1]'
            }`}
          >
            {selectedTask.priority} Priority
          </span>
          {diagnostics.criticalPathIds.has(selectedTask.id) && (
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#B8860B]/15 text-[#FBBF24]">
              Critical Path
            </span>
          )}
        </div>
        <h5 className="font-serif text-lg font-bold text-[#1F1C18]">
          {selectedTask.title}
        </h5>
        <p className="text-xs text-[#6E655A]">
          {selectedTask.description ||
            'Drag bar horizontally, press Left/Right Arrow keys to reschedule, or Shift+Arrow keys to adjust duration.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
        {/* Duration Days */}
        <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl px-3 py-2">
          <label
            htmlFor={durationInputId}
            className="block text-xs uppercase tracking-wider text-[#6E655A] font-semibold mb-1"
          >
            Duration (Days)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Decrease task duration by 1 day"
              onClick={() =>
                onUpdateDuration(
                  selectedTask.id,
                  Math.max(1, selectedWindow.durationDays - 1)
                )
              }
              className="w-6 h-6 rounded bg-white border border-[#E6DFD3] text-xs font-bold text-[#1F1C18] hover:border-[#B8860B]"
            >
              -
            </button>
            <input
              id={durationInputId}
              type="number"
              min={1}
              max={90}
              value={selectedWindow.durationDays}
              onChange={(e) =>
                onUpdateDuration(
                  selectedTask.id,
                  Math.max(1, Math.min(90, Number(e.target.value) || 1))
                )
              }
              className="w-12 text-center font-mono text-xs font-bold text-[#1F1C18] bg-white border border-[#E6DFD3] rounded py-0.5"
            />
            <button
              type="button"
              aria-label="Increase task duration by 1 day"
              onClick={() =>
                onUpdateDuration(
                  selectedTask.id,
                  Math.min(90, selectedWindow.durationDays + 1)
                )
              }
              className="w-6 h-6 rounded bg-white border border-[#E6DFD3] text-xs font-bold text-[#1F1C18] hover:border-[#B8860B]"
            >
              +
            </button>
          </div>
        </div>

        {/* Due Date */}
        <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl px-3 py-2">
          <label
            htmlFor={dueDateInputId}
            className="block text-xs uppercase tracking-wider text-[#6E655A] font-semibold mb-1"
          >
            Due Date (Start: {selectedWindow.startIso})
          </label>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
            <input
              id={dueDateInputId}
              type="date"
              value={selectedWindow.endIso}
              onChange={(e) => {
                if (e.target.value) {
                  onUpdateDueDate(selectedTask.id, e.target.value);
                }
              }}
              className="text-xs font-mono text-[#1F1C18] bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={() =>
                onUpdateDueDate(
                  selectedTask.id,
                  addDaysIso(selectedWindow.endIso, -1, eventDate)
                )
              }
              aria-label="Move due date 1 day earlier"
              className="px-1.5 py-0.5 rounded bg-white border border-[#E6DFD3] text-xs font-mono hover:border-[#B8860B]"
            >
              -1d
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateDueDate(
                  selectedTask.id,
                  addDaysIso(selectedWindow.endIso, 1, eventDate)
                )
              }
              aria-label="Move due date 1 day later"
              className="px-1.5 py-0.5 rounded bg-white border border-[#E6DFD3] text-xs font-mono hover:border-[#B8860B]"
            >
              +1d
            </button>
          </div>
        </div>

        {/* Prerequisite Selector */}
        <div className="bg-[#FAF7F2] border border-[#E6DFD3] rounded-xl px-3 py-2">
          <label
            htmlFor={dependencySelectId}
            className="block text-xs uppercase tracking-wider text-[#6E655A] font-semibold mb-1"
          >
            Prerequisite (Blocked By)
          </label>
          <div className="flex items-center gap-1.5">
            <select
              id={dependencySelectId}
              value={selectedTask.dependsOnTaskId || ''}
              onChange={(e) =>
                onUpdateDependency(selectedTask.id, e.target.value || undefined)
              }
              className="text-xs text-[#1F1C18] bg-transparent focus:outline-none max-w-[180px] truncate"
            >
              <option value="">None (Root Milestone)</option>
              {allWindows
                .filter((w) => w.task.id !== selectedTask.id)
                .map((candidate) => {
                  const createsCycle = wouldCreateDependencyCycle(
                    tasks,
                    selectedTask.id,
                    candidate.task.id
                  );
                  return (
                    <option
                      key={candidate.task.id}
                      value={candidate.task.id}
                      disabled={createsCycle}
                    >
                      {candidate.task.title} ({candidate.endIso})
                      {createsCycle ? ' [Cycle]' : ''}
                    </option>
                  );
                })}
            </select>
            {selectedTask.dependsOnTaskId && (
              <button
                type="button"
                onClick={() => onUpdateDependency(selectedTask.id, undefined)}
                aria-label="Remove prerequisite dependency"
                className="text-[#F87171] hover:bg-[#A63A2B]/10 p-1 rounded"
              >
                <Unlink className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Status Cycle & Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleTaskStatus(selectedTask.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1F1C18] text-white hover:bg-[#332E28] transition-colors min-h-[36px]"
          >
            {selectedTask.status === 'Done' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" aria-hidden="true" />
            ) : selectedTask.status === 'In Progress' ? (
              <Clock className="w-3.5 h-3.5 text-[#FBBF24]" aria-hidden="true" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-[#CBD5E1]" aria-hidden="true" />
            )}
            Status: {selectedTask.status}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close selected task inspector"
            className="p-2 rounded-xl border border-[#E6DFD3] text-[#6E655A] hover:text-[#1F1C18] min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
