import React from 'react';
import {
  GitBranch,
  Flame,
  Lock,
  AlertTriangle,
  Network,
  FolderTree,
  Wand2,
  Link2,
  X,
} from 'lucide-react';

export interface DagStatsAndToolbarProps {
  totalChainCount: number;
  maxDepth: number;
  criticalCount: number;
  blockedCount: number;
  overdueCount: number;
  conflictCount: number;
  displayMode: 'dag' | 'tree';
  onSetDisplayMode: (mode: 'dag' | 'tree') => void;
  filterMode: 'all' | 'critical' | 'blocked';
  onSetFilterMode: (mode: 'all' | 'critical' | 'blocked') => void;
  unlinkedCount: number;
  onAutoInfer: () => void;
  onAutoResolveConflicts: () => void;
  linkingSourceId: string | null;
  linkingSourceTitle?: string;
  onCancelLinking: () => void;
  cycleError: string | null;
}

/**
 * Renders the 4 summary metric cards, view/filter toolbar, and status/alert banners
 * for the TaskDependencyGraph component.
 */
export const DagStatsAndToolbar: React.FC<DagStatsAndToolbarProps> = ({
  totalChainCount,
  maxDepth,
  criticalCount,
  blockedCount,
  overdueCount,
  conflictCount,
  displayMode,
  onSetDisplayMode,
  filterMode,
  onSetFilterMode,
  unlinkedCount,
  onAutoInfer,
  onAutoResolveConflicts,
  linkingSourceId,
  linkingSourceTitle,
  onCancelLinking,
  cycleError,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#6E655A] block">
              Dependency Chains
            </span>
            <p className="font-serif text-2xl font-bold text-[#1F1C18] mt-1">
              {totalChainCount}
            </p>
            <span className="text-xs text-[#6E655A]">
              Max depth: {maxDepth} stage{maxDepth === 1 ? '' : 's'}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] flex items-center justify-center text-[#1F1C18]"
          >
            <GitBranch className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold block">
              Critical Path
            </span>
            <p className="font-serif text-2xl font-bold text-[#B8860B] mt-1">
              {criticalCount}
            </p>
            <span className="text-xs text-[#6E655A]">
              Zero-slack bottleneck tasks
            </span>
          </div>
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-xl bg-[#B8860B]/10 border border-[#B8860B]/25 flex items-center justify-center text-[#B8860B]"
          >
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#A63A2B] font-semibold block">
              Active Blockers
            </span>
            <p className="font-serif text-2xl font-bold text-[#F87171] mt-1">
              {blockedCount}
            </p>
            <span className="text-xs text-[#6E655A]">
              Awaiting prerequisite completion
            </span>
          </div>
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-xl bg-[#A63A2B]/10 border border-[#A63A2B]/25 flex items-center justify-center text-[#F87171]"
          >
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#E6DFD3] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#6E655A] block">
              Date Overlaps / Overdue
            </span>
            <p
              className={`font-serif text-2xl font-bold mt-1 ${
                conflictCount + overdueCount > 0
                  ? 'text-[#F87171]'
                  : 'text-[#34D399]'
              }`}
            >
              {conflictCount + overdueCount}
            </p>
            <span className="text-xs text-[#6E655A]">
              {conflictCount > 0
                ? `${conflictCount} schedule conflict(s)`
                : 'Chronology aligned'}
            </span>
          </div>
          <div
            aria-hidden="true"
            className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              conflictCount + overdueCount > 0
                ? 'bg-[#A63A2B]/10 border-[#A63A2B]/25 text-[#F87171]'
                : 'bg-[#2E5A44]/10 border-[#2E5A44]/25 text-[#34D399]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Interactive Control Bar */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl p-3.5 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Dependency visualization mode"
            className="inline-flex rounded-xl bg-[#FAF7F2] p-1 border border-[#E6DFD3]"
          >
            <button
              type="button"
              aria-pressed={displayMode === 'dag'}
              onClick={() => onSetDisplayMode('dag')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                displayMode === 'dag'
                  ? 'bg-[#1F1C18] text-white shadow-xs'
                  : 'text-[#6E655A] hover:text-[#1F1C18]'
              }`}
            >
              <Network className="w-3.5 h-3.5" aria-hidden="true" /> Flow Graph (DAG)
            </button>
            <button
              type="button"
              aria-pressed={displayMode === 'tree'}
              onClick={() => onSetDisplayMode('tree')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                displayMode === 'tree'
                  ? 'bg-[#1F1C18] text-white shadow-xs'
                  : 'text-[#6E655A] hover:text-[#1F1C18]'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" aria-hidden="true" /> Hierarchy Tree
            </button>
          </div>

          <div
            role="group"
            aria-label="Filter dependency tasks"
            className="inline-flex rounded-xl bg-[#FAF7F2] p-1 border border-[#E6DFD3]"
          >
            {(['all', 'critical', 'blocked'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={filterMode === mode}
                onClick={() => onSetFilterMode(mode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  filterMode === mode
                    ? 'bg-white text-[#1F1C18] shadow-xs border border-[#E6DFD3]'
                    : 'text-[#6E655A] hover:text-[#1F1C18]'
                }`}
              >
                {mode === 'all'
                  ? 'All Tasks'
                  : mode === 'critical'
                  ? 'Critical Path'
                  : 'Blocked / Urgent'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unlinkedCount > 0 && (
            <button
              type="button"
              onClick={onAutoInfer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] text-[#1F1C18] border border-[#E6DFD3] hover:border-[#B8860B] transition-colors min-h-[34px]"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
              Auto-Link Unconnected ({unlinkedCount})
            </button>
          )}
          {conflictCount > 0 && (
            <button
              type="button"
              onClick={onAutoResolveConflicts}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#A63A2B] text-white hover:bg-[#8C3023] transition-colors min-h-[34px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              Auto-Shift {conflictCount} Date Conflict
              {conflictCount > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {linkingSourceId && (
        <div
          role="status"
          className="bg-[#B8860B]/15 border border-[#B8860B]/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-[#1F1C18]"
        >
          <span className="font-medium flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#B8860B]" aria-hidden="true" />
            Linking mode active: Select a target task that is{' '}
            <strong>blocked by</strong> &ldquo;{linkingSourceTitle}&rdquo;
          </span>
          <button
            type="button"
            onClick={onCancelLinking}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#E6DFD3] text-xs font-semibold hover:bg-[#FAF7F2]"
          >
            Cancel
          </button>
        </div>
      )}

      {cycleError && (
        <div
          role="alert"
          className="bg-[#A63A2B]/10 border border-[#A63A2B]/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-[#F87171] font-medium"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            {cycleError}
          </span>
          <button
            type="button"
            onClick={onCancelLinking}
            aria-label="Dismiss dependency cycle warning"
            className="p-1"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
};
