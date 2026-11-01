import React, { useId } from 'react';
import {
  Sparkles,
  Check,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react';
import { PlanoraEvent, BudgetItem, PaymentStatus } from '../../types/event';
import { BudgetMetrics, formatCurrency } from '../../utils/budgetCalculations';
import { BudgetDonutChart } from '../BudgetDonutChart';
import { BudgetExpenseTable } from './BudgetExpenseTable';

export interface OptimizerProposalItem {
  id: string;
  category: string;
  title: string;
  currentPlanned: number;
  recommendedPlanned: number;
  rationale: string;
}

export interface BudgetSectionProps {
  activeEvent: PlanoraEvent;
  metrics: BudgetMetrics;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  lockedCategories: string[];
  onToggleLockedCategory: (cat: string) => void;
  isOptimizingBudget: boolean;
  optimizerProposal: {
    strategySummary: string;
    adjustments: OptimizerProposalItem[];
  } | null;
  onDismissOptimizerProposal: () => void;
  onApplyOptimizerProposal: () => void;
  onAiOptimizeBudget: () => void;
  onInstantRebalanceBudget: () => void;
  onUpdateEventMeta: (updates: Partial<PlanoraEvent>) => void;
  newItem: {
    category: string;
    title: string;
    plannedAmount: number;
    quotedAmount: number;
    actualAmount: number;
    paymentStatus: PaymentStatus;
    notes: string;
  };
  onSetNewItem: React.Dispatch<
    React.SetStateAction<{
      category: string;
      title: string;
      plannedAmount: number;
      quotedAmount: number;
      actualAmount: number;
      paymentStatus: PaymentStatus;
      notes: string;
    }>
  >;
  onAddBudgetItem: (e: React.FormEvent) => void;
  onUpdateBudgetItemField: (
    itemId: string,
    field: keyof BudgetItem,
    value: string | number
  ) => void;
  onDeleteBudgetItem: (itemId: string) => void;
  filteredBudgetItems: BudgetItem[];
}

/**
 * Budget Optimizer & Expense Tracker section with accessible form controls,
 * category locking, AI optimization preview, and line-item ledger.
 */
export const BudgetSection: React.FC<BudgetSectionProps> = React.memo(({
  activeEvent,
  metrics,
  selectedCategory,
  onSelectCategory,
  lockedCategories,
  onToggleLockedCategory,
  isOptimizingBudget,
  optimizerProposal,
  onDismissOptimizerProposal,
  onApplyOptimizerProposal,
  onAiOptimizeBudget,
  onInstantRebalanceBudget,
  onUpdateEventMeta,
  newItem,
  onSetNewItem,
  onAddBudgetItem,
  onUpdateBudgetItemField,
  onDeleteBudgetItem,
  filteredBudgetItems,
}) => {
  const uid = useId();
  const totalBudgetRangeId = `${uid}-total-budget-range`;
  const totalBudgetNumId = `${uid}-total-budget-num`;
  const contingencyRangeId = `${uid}-contingency-range`;
  const guestCountNumId = `${uid}-guest-count-num`;

  const allCategories = Array.from(
    new Set(activeEvent.budgetItems.map((i) => i.category))
  );

  return (
    <div className="space-y-6" aria-busy={isOptimizingBudget}>
      {/* Top Controls: Budget Cap, Contingency Slider & AI Rebalancer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#1F1C18]">
                Budget Guardrails &amp; Reserve
              </h3>
              <p className="text-xs text-[#6E655A]">
                Adjust total budget cap, guest count, or lock priority categories
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                metrics.healthStatus === 'Healthy'
                  ? 'bg-[#2E5A44]/15 text-[#34D399]'
                  : metrics.healthStatus === 'Tight'
                  ? 'bg-[#D97706]/15 text-[#FBBF24]'
                  : 'bg-[#A63A2B]/15 text-[#F87171]'
              }`}
            >
              {metrics.healthStatus}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label
                  htmlFor={totalBudgetNumId}
                  className="font-semibold text-[#6E655A] uppercase tracking-wider"
                >
                  Total Event Budget Cap
                </label>
                <span className="font-mono font-bold text-base text-[#1F1C18]">
                  {formatCurrency(activeEvent.totalBudget)}
                </span>
              </div>
              <input
                id={totalBudgetRangeId}
                type="range"
                min={2000}
                max={Math.max(150000, activeEvent.totalBudget * 1.5)}
                step={500}
                aria-label="Total Event Budget Cap Slider"
                value={activeEvent.totalBudget}
                onChange={(e) =>
                  onUpdateEventMeta({ totalBudget: Number(e.target.value) })
                }
                className="w-full accent-[#22D3EE]"
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-[#6E655A]">Exact Cap ($):</span>
                <input
                  id={totalBudgetNumId}
                  type="number"
                  min={500}
                  step={250}
                  value={activeEvent.totalBudget}
                  onChange={(e) =>
                    onUpdateEventMeta({
                      totalBudget: Math.max(500, Number(e.target.value) || 500),
                    })
                  }
                  className="px-3 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] font-mono text-xs text-[#1F1C18] w-32"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E6DFD3]">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor={contingencyRangeId}
                    className="font-semibold text-[#6E655A] uppercase tracking-wider"
                  >
                    Contingency ({activeEvent.contingencyPercent}%)
                  </label>
                  <span className="font-mono font-semibold text-[#B8860B]">
                    {formatCurrency(metrics.contingencyAmount)}
                  </span>
                </div>
                <input
                  id={contingencyRangeId}
                  type="range"
                  min={0}
                  max={25}
                  step={1}
                  value={activeEvent.contingencyPercent}
                  onChange={(e) =>
                    onUpdateEventMeta({
                      contingencyPercent: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#22D3EE]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label
                    htmlFor={guestCountNumId}
                    className="font-semibold text-[#6E655A] uppercase tracking-wider"
                  >
                    Guest Count
                  </label>
                  <span className="font-mono font-semibold text-[#1F1C18]">
                    {formatCurrency(metrics.costPerGuestPlanned)}/guest
                  </span>
                </div>
                <input
                  id={guestCountNumId}
                  type="number"
                  min={10}
                  max={25000}
                  value={activeEvent.guestCount}
                  onChange={(e) =>
                    onUpdateEventMeta({
                      guestCount: Math.max(10, Number(e.target.value) || 10),
                    })
                  }
                  className="w-full px-3 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3] font-mono text-xs text-[#1F1C18]"
                />
              </div>
            </div>

            {/* Category Locks for AI Optimizer */}
            <fieldset className="pt-2 border-t border-[#E6DFD3]">
              <legend className="text-xs font-semibold uppercase tracking-wider text-[#6E655A] block mb-2">
                Lock Categories From Rebalancing (Click to toggle)
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((cat) => {
                  const isLocked = lockedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      aria-pressed={isLocked}
                      onClick={() => onToggleLockedCategory(cat)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors min-h-[28px] ${
                        isLocked
                          ? 'bg-[#1F1C18] text-white border-[#1F1C18]'
                          : 'bg-[#FAF7F2] text-[#6E655A] border-[#E6DFD3] hover:text-[#1F1C18]'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-3 h-3 text-[#B8860B]" aria-hidden="true" />
                      ) : (
                        <Unlock className="w-3 h-3 opacity-60" aria-hidden="true" />
                      )}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onAiOptimizeBudget}
                disabled={isOptimizingBudget}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1F1C18] text-white hover:bg-[#332E28] transition-colors disabled:opacity-60 min-h-[38px]"
              >
                {isOptimizingBudget ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    Optimizing Allocation...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                    AI Smart Optimize Budget
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onInstantRebalanceBudget}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#FAF7F2] border border-[#E6DFD3] text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors min-h-[38px]"
              >
                Proportional Fit
              </button>
            </div>
          </div>
        </div>

        {/* Visual Donut & Financial Summary */}
        <div className="lg:col-span-7 bg-white border border-[#E6DFD3] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#1F1C18]">
                Interactive Category Breakdown
              </h3>
              <p className="text-xs text-[#6E655A]">
                Click any category slice or legend row to filter the expense
                table below
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs uppercase text-[#6E655A] block">
                Usable vs Planned
              </span>
              <span
                className={`text-sm font-bold ${
                  metrics.isOverAllocated ? 'text-[#F87171]' : 'text-[#34D399]'
                }`}
              >
                {formatCurrency(metrics.totalPlanned)} /{' '}
                {formatCurrency(metrics.usableBudget)}
              </span>
            </div>
          </div>

          <BudgetDonutChart
            categories={metrics.categoryBreakdown}
            totalPlanned={metrics.totalPlanned}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
          />
        </div>
      </div>

      {/* AI Optimizer Proposal Review Banner */}
      {optimizerProposal && (
        <div
          role="region"
          aria-label="AI Budget Optimization Proposal"
          className="bg-[#2E5A44]/10 border border-[#2E5A44]/30 rounded-2xl p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[#34D399] font-semibold">
                AI Budget Optimization Proposal
              </span>
              <h4 className="font-serif text-lg font-bold text-[#1F1C18]">
                {optimizerProposal.strategySummary}
              </h4>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onApplyOptimizerProposal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#2E5A44] text-white hover:bg-[#234735] transition-colors min-h-[36px]"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Apply Recommended
                Allocations
              </button>
              <button
                type="button"
                onClick={onDismissOptimizerProposal}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E6DFD3] text-[#6E655A] hover:text-[#1F1C18] min-h-[36px]"
              >
                Dismiss
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {optimizerProposal.adjustments.map((adj) => {
              const delta = adj.recommendedPlanned - adj.currentPlanned;
              return (
                <div
                  key={adj.id}
                  className="bg-white border border-[#E6DFD3] rounded-xl p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-[#1F1C18]">
                    <span className="truncate">{adj.title}</span>
                    <span
                      className={`font-mono ${
                        delta <= 0 ? 'text-[#34D399]' : 'text-[#FBBF24]'
                      }`}
                    >
                      {formatCurrency(adj.currentPlanned)} →{' '}
                      {formatCurrency(adj.recommendedPlanned)}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E655A]">{adj.rationale}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BudgetExpenseTable
        filteredBudgetItems={filteredBudgetItems}
        allCategories={allCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        newItem={newItem}
        onSetNewItem={onSetNewItem}
        onAddBudgetItem={onAddBudgetItem}
        onUpdateBudgetItemField={onUpdateBudgetItemField}
        onDeleteBudgetItem={onDeleteBudgetItem}
      />
    </div>
  );
});
