import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { PlanoraEvent } from '../../types/event';
import { BudgetMetrics, formatCurrency } from '../../utils/budgetCalculations';
import { TaskScheduleDiagnostics } from '../../utils/taskScheduler';
import { BudgetDonutChart } from '../BudgetDonutChart';

export interface OverviewSectionProps {
  activeEvent: PlanoraEvent;
  metrics: BudgetMetrics;
  taskDiagnostics: TaskScheduleDiagnostics;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  onNavigateToSection: (
    section:
      | 'overview'
      | 'budget'
      | 'timeline'
      | 'vendors'
      | 'scenarios'
      | 'export'
  ) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onInstantRebalanceBudget: () => void;
}

/**
 * Executive Overview section summarizing strategic AI concept, budget allocation donut,
 * critical upcoming milestones, and risk contingencies.
 */
export const OverviewSection: React.FC<OverviewSectionProps> = React.memo(({
  activeEvent,
  metrics,
  taskDiagnostics,
  selectedCategory,
  onSelectCategory,
  onNavigateToSection,
  onToggleTaskStatus,
  onInstantRebalanceBudget,
}) => {
  const completedTasks = activeEvent.tasks.filter(
    (t) => t.status === 'Done'
  ).length;
  const totalTasks = activeEvent.tasks.length;
  const bookedVendors = activeEvent.vendors.filter(
    (v) => v.bookingStatus === 'Booked'
  ).length;

  return (
    <div className="space-y-6">
      {/* Over-Allocation Warning Banner */}
      {metrics.isOverAllocated && (
        <div
          role="alert"
          className="bg-[#A63A2B]/10 border border-[#A63A2B]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 text-[#F87171] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-bold text-[#F87171]">
                Planned Allocations Exceed Usable Budget by{' '}
                {formatCurrency(metrics.overAllocatedAmount)}
              </h2>
              <p className="text-xs text-[#CBD5E1] mt-0.5">
                After reserving {activeEvent.contingencyPercent}% (
                {formatCurrency(metrics.contingencyAmount)}) for contingency,
                your usable budget is {formatCurrency(metrics.usableBudget)}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onInstantRebalanceBudget}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#A63A2B] text-white hover:bg-[#8B2F22] transition-colors min-h-[36px]"
            >
              Auto-Rebalance Now
            </button>
            <button
              type="button"
              onClick={() => onNavigateToSection('budget')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E6DFD3] text-[#1F1C18] hover:bg-[#FAF7F2] transition-colors min-h-[36px]"
            >
              Inspect Budget
            </button>
          </div>
        </div>
      )}

      {/* AI Concept & Risk Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#B8860B] font-semibold">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> AI Strategic
                Concept &amp; Budget Narrative
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-[#F3EFE6] text-[#6E655A]">
                {activeEvent.venuePreference}
              </span>
            </div>
            <p className="text-sm text-[#1F1C18] leading-relaxed">
              {activeEvent.aiConceptSummary}
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-[#E6DFD3]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#6E655A] block mb-2">
              Weighted Priorities
            </span>
            <div className="flex flex-wrap gap-2">
              {activeEvent.priorities.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-medium text-[#1F1C18]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#F87171] font-semibold mb-3">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Proactive Risk
              &amp; Contingency Radar
            </span>
            <p className="text-xs text-[#6E655A] leading-relaxed whitespace-pre-line">
              {activeEvent.aiRisksAndContingencies}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E6DFD3] flex items-center justify-between text-xs">
            <span className="text-[#6E655A]">
              Contingency Buffer ({activeEvent.contingencyPercent}%):
            </span>
            <span className="font-mono font-bold text-[#34D399]">
              {formatCurrency(metrics.contingencyAmount)} Protected
            </span>
          </div>
        </div>
      </div>

      {/* Donut Chart + Upcoming Critical Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1F1C18]">
                Budget Allocation by Category
              </h2>
              <p className="text-xs text-[#6E655A]">
                Click any category slice to filter line items
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToSection('budget')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B8860B] hover:underline min-h-[28px]"
            >
              Open Full Budget <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <BudgetDonutChart
            categories={metrics.categoryBreakdown}
            totalPlanned={metrics.totalPlanned}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              onSelectCategory(cat);
              if (cat) onNavigateToSection('budget');
            }}
          />
        </div>

        <div className="lg:col-span-6 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-[#1F1C18]">
                  Next Critical Milestones ({completedTasks}/{totalTasks} Done)
                </h2>
                <p className="text-xs text-[#6E655A]">
                  Click status icon to cycle Todo → In Progress → Done
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToSection('timeline')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#B8860B] hover:underline min-h-[28px]"
              >
                Gantt &amp; DAG View <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2.5">
              {activeEvent.tasks.slice(0, 5).map((task) => {
                const isBlocked = taskDiagnostics.blockedTaskIds.has(task.id);
                const isOverdue = taskDiagnostics.overdueTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3]"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task.id)}
                      className="flex items-center gap-2.5 text-left min-w-0 flex-1"
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
                        <p
                          className={`text-xs font-semibold truncate ${
                            task.status === 'Done'
                              ? 'line-through text-[#94A3B8]'
                              : 'text-[#1F1C18]'
                          }`}
                        >
                          {task.title}
                        </p>
                        <span className="text-xs text-[#6E655A] block">
                          {task.category} · {task.assignee}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {isBlocked && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#A63A2B]/15 text-[#F87171] text-xs font-bold uppercase">
                          <Lock className="w-3 h-3" aria-hidden="true" /> Blocked
                        </span>
                      )}
                      {isOverdue && (
                        <span className="px-1.5 py-0.5 rounded bg-[#A63A2B] text-white text-xs font-bold uppercase">
                          Overdue
                        </span>
                      )}
                      <span className="font-mono text-xs text-[#6E655A]">
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E6DFD3] flex items-center justify-between text-xs text-[#6E655A]">
            <span>
              Vendors Booked:{' '}
              <strong className="font-mono text-[#1F1C18]">
                {bookedVendors} / {activeEvent.vendors.length}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateToSection('vendors')}
              className="text-[#B8860B] font-semibold hover:underline"
            >
              Manage Vendors &amp; Ideas →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
