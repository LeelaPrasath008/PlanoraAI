import React from 'react';
import {
  Sliders,
  Sparkles,
  Wand2,
  ZoomIn,
  ZoomOut,
  X,
  Link2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { TimelineTask } from '../../types/event';

export interface GanttToolbarProps {
  taskCount: number;
  conflictCount: number;
  criticalCount: number;
  unlinkedCount: number;
  cascadeDependents: boolean;
  onToggleCascade: () => void;
  onAutoLink: () => void;
  onAutoFixOverlaps: () => void;
  zoomLevel: 'compact' | 'comfortable' | 'detailed';
  onCycleZoom: () => void;
  linkingFromTaskId: string | null;
  linkingFromTaskTitle?: string;
  onCancelLinking: () => void;
  feedbackToast: {
    message: string;
    tone: 'info' | 'warning' | 'success';
  } | null;
  tasks: TimelineTask[];
}

/**
 * Renders the top header bar, zoom/cascade controls, dependency-linking banner,
 * status toast (`role="status"`), and schedule-conflict alert (`role="alert"`) for the Gantt chart.
 */
export const GanttToolbar: React.FC<GanttToolbarProps> = ({
  taskCount,
  conflictCount,
  criticalCount,
  unlinkedCount,
  cascadeDependents,
  onToggleCascade,
  onAutoLink,
  onAutoFixOverlaps,
  zoomLevel,
  onCycleZoom,
  linkingFromTaskId,
  linkingFromTaskTitle,
  onCancelLinking,
  feedbackToast,
}) => {
  return (
    <>
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-xl bg-[#1F1C18] text-[#FAF7F2] flex items-center justify-center"
            >
              <Sliders className="w-4 h-4 text-[#B8860B]" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-[#1F1C18] leading-tight">
                Interactive Draggable Gantt Timeline
              </h4>
              <p className="text-xs text-[#6E655A]">
                Drag or use Arrow keys (±1d) &amp; Shift+Arrow keys (resize) •
                Click connector dots to link dependencies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto lg:ml-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-mono text-[#1F1C18]">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-[#2E5A44]"
              />
              {taskCount} Scheduled
            </span>
            {conflictCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#A63A2B]/10 border border-[#A63A2B]/30 text-xs font-mono font-semibold text-[#F87171]">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                {conflictCount} Overlap{conflictCount > 1 ? 's' : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B8860B]/10 border border-[#B8860B]/30 text-xs font-mono font-semibold text-[#B8860B]">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              {criticalCount} Critical Path
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleCascade}
            aria-pressed={cascadeDependents}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all min-h-[34px] ${
              cascadeDependents
                ? 'bg-[#2E5A44]/10 border-[#2E5A44]/40 text-[#34D399]'
                : 'bg-[#FAF7F2] border-[#E6DFD3] text-[#6E655A]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full ${
                cascadeDependents ? 'bg-[#34D399]' : 'bg-[#94A3B8]'
              }`}
            />
            Auto-Cascade Dependents: {cascadeDependents ? 'ON' : 'OFF'}
          </button>

          {unlinkedCount > 0 && (
            <button
              type="button"
              onClick={onAutoLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#E6DFD3] text-[#1F1C18] hover:border-[#B8860B] transition-colors min-h-[34px]"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
              Auto-Chain ({unlinkedCount})
            </button>
          )}

          {conflictCount > 0 && (
            <button
              type="button"
              onClick={onAutoFixOverlaps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#A63A2B] text-white hover:bg-[#8B2F22] transition-colors shadow-xs min-h-[34px]"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Auto-Shift Overlaps
            </button>
          )}

          <button
            type="button"
            onClick={onCycleZoom}
            aria-label={`Change timeline zoom level, current zoom is ${zoomLevel}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#E6DFD3] text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors min-h-[34px]"
          >
            {zoomLevel === 'detailed' ? (
              <ZoomOut className="w-3.5 h-3.5 text-[#6E655A]" aria-hidden="true" />
            ) : (
              <ZoomIn className="w-3.5 h-3.5 text-[#6E655A]" aria-hidden="true" />
            )}
            Zoom: <span className="capitalize">{zoomLevel}</span>
          </button>
        </div>
      </div>

      {linkingFromTaskId && (
        <div
          role="status"
          className="bg-[#1F1C18] text-[#FAF7F2] rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <Link2
              className="w-4 h-4 text-[#B8860B] animate-pulse shrink-0"
              aria-hidden="true"
            />
            <span>
              Linking prerequisite{' '}
              <strong className="text-[#B8860B]">{linkingFromTaskTitle}</strong>{' '}
              → Click any target task bar or its left connector port to make it
              depend on this task.
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelLinking}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors min-h-[30px]"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" /> Cancel
          </button>
        </div>
      )}

      {feedbackToast && (
        <div
          role={feedbackToast.tone === 'warning' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-2.5 text-xs font-medium flex items-center justify-between border ${
            feedbackToast.tone === 'warning'
              ? 'bg-[#A63A2B]/10 border-[#A63A2B]/30 text-[#F87171]'
              : feedbackToast.tone === 'success'
              ? 'bg-[#2E5A44]/10 border-[#2E5A44]/30 text-[#34D399]'
              : 'bg-[#B8860B]/10 border-[#B8860B]/30 text-[#FBBF24]'
          }`}
        >
          <span className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {feedbackToast.message}
          </span>
        </div>
      )}
    </>
  );
};
