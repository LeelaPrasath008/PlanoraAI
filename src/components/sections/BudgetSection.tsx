import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  Search,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  BudgetExpenseItem,
  formatCurrency,
  PlanoraEvent,
} from '../../types/event';
import {
  BudgetOptimizationAdjustment,
  BudgetSummaryMetrics,
} from '../../utils/budgetCalculations';
import { BudgetDonutChart } from '../BudgetDonutChart';

interface BudgetSectionProps {
  activeEvent: PlanoraEvent;
  budgetSummary: BudgetSummaryMetrics;
  isReadOnly: boolean;
  ownerId: string;
  isOptimizingBudget: boolean;
  budgetOptimizationPreview: {
    strategySummary: string;
    adjustments: BudgetOptimizationAdjustment[];
  } | null;
  onRunBudgetOptimizer: () => Promise<void>;
  onConfirmBudgetOptimization: () => Promise<void>;
  onDismissBudgetOptimization: () => void;
  onUpdateBudgetItem: (updated: BudgetExpenseItem) => Promise<void>;
  onDeleteBudgetItem: (itemId: string) => Promise<void>;
  onAddBudgetItem: (item: BudgetExpenseItem) => Promise<void>;
}

export const BudgetSection: React.FC<BudgetSectionProps> = React.memo(
  ({
    activeEvent,
    budgetSummary,
    isReadOnly,
    ownerId,
    isOptimizingBudget,
    budgetOptimizationPreview,
    onRunBudgetOptimizer,
    onConfirmBudgetOptimization,
    onDismissBudgetOptimization,
    onUpdateBudgetItem,
    onDeleteBudgetItem,
    onAddBudgetItem,
  }) => {
    const [budgetFilter, setBudgetFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const deferredQuery = useDeferredValue(searchQuery);

    const [newExpense, setNewExpense] = useState({
      category: 'Catering',
      title: '',
      plannedAmount: '',
      quotedAmount: '',
      actualAmount: '',
      paymentStatus: 'Unpaid' as BudgetExpenseItem['paymentStatus'],
      notes: '',
    });

    const filteredItems = useMemo(() => {
      const q = deferredQuery.trim().toLowerCase();
      return activeEvent.budgetItems.filter(
        (b) =>
          (budgetFilter === 'All' || b.paymentStatus === budgetFilter) &&
          (!q ||
            b.title.toLowerCase().includes(q) ||
            b.category.toLowerCase().includes(q))
      );
    }, [activeEvent.budgetItems, budgetFilter, deferredQuery]);

    const handleExpenseSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newExpense.title.trim()) return;
      const planned = Number(newExpense.plannedAmount) || 0;
      const item: BudgetExpenseItem = {
        id: `b_man_${Date.now()}`,
        eventId: activeEvent.id,
        ownerId,
        category: newExpense.category.trim() || 'General',
        title: newExpense.title.trim(),
        plannedAmount: planned,
        quotedAmount: Number(newExpense.quotedAmount) || planned,
        actualAmount: Number(newExpense.actualAmount) || 0,
        lowEstimate: Math.round(planned * 0.9),
        highEstimate: Math.round(planned * 1.15),
        paymentStatus: newExpense.paymentStatus,
        notes: newExpense.notes.trim(),
      };
      await onAddBudgetItem(item);
      setNewExpense({
        category: 'Catering',
        title: '',
        plannedAmount: '',
        quotedAmount: '',
        actualAmount: '',
        paymentStatus: 'Unpaid',
        notes: '',
      });
    };

    return (
      <section aria-label="Intelligent Budget Management" className="space-y-6">
        {budgetSummary.isOverspent && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="w-4 h-4 text-red-600 shrink-0"
                aria-hidden="true"
              />
              <span>
                <strong>Overspending Alert:</strong> Your planned expenses plus{' '}
                {activeEvent.contingencyPercent}% contingency reserve exceed your{' '}
                {formatCurrency(
                  activeEvent.totalBudget,
                  activeEvent.currency
                )}{' '}
                budget by{' '}
                <strong>
                  {formatCurrency(
                    Math.abs(budgetSummary.remainingBudget),
                    activeEvent.currency
                  )}
                </strong>
                . Use “Optimize My Budget” to generate cost-saving adjustments.
              </span>
            </div>
            <button
              type="button"
              disabled={isOptimizingBudget}
              onClick={onRunBudgetOptimizer}
              className="px-3.5 py-1.5 font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg whitespace-nowrap shrink-0"
            >
              Optimize Now
            </button>
          </div>
        )}

        <BudgetDonutChart
          items={activeEvent.budgetItems}
          totalBudget={activeEvent.totalBudget}
          contingencyPercent={activeEvent.contingencyPercent}
          currency={activeEvent.currency}
        />

        {/* AI Optimize My Budget Action & Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#1E1B4B] font-display">
                AI Budget Optimizer
              </h2>
              <p className="text-xs text-slate-500">
                Preserves your stated priorities ({activeEvent.priorities}) while
                suggesting realistic category adjustments.
              </p>
            </div>
            <button
              type="button"
              disabled={isOptimizingBudget}
              onClick={onRunBudgetOptimizer}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1E1B4B] hover:bg-slate-900 rounded-lg self-start"
            >
              {isOptimizingBudget ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Optimize My Budget</span>
            </button>
          </div>

          {budgetOptimizationPreview && (
            <div
              role="region"
              aria-label="Proposed budget optimization preview"
              className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-3 text-xs"
            >
              <div className="font-semibold text-[#1E1B4B]">
                Proposed Optimization Strategy (Preview):
              </div>
              <p className="text-slate-700">
                {budgetOptimizationPreview.strategySummary}
              </p>
              <div className="overflow-x-auto bg-white border border-slate-200 rounded-md">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                      <th scope="col" className="py-2 px-3">
                        Category
                      </th>
                      <th scope="col" className="py-2 px-3 text-right">
                        Current
                      </th>
                      <th scope="col" className="py-2 px-3 text-right">
                        Recommended
                      </th>
                      <th scope="col" className="py-2 px-3">
                        Rationale
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {budgetOptimizationPreview.adjustments.map((adj) => (
                      <tr key={adj.id}>
                        <td className="py-2 px-3 font-medium">
                          {adj.category} · {adj.title}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {formatCurrency(
                            adj.currentPlanned,
                            activeEvent.currency
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                          {formatCurrency(
                            adj.recommendedPlanned,
                            activeEvent.currency
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {adj.rationale}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onDismissBudgetOptimization}
                  className="px-3 py-1.5 text-slate-600 bg-white border border-slate-300 rounded-md"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={onConfirmBudgetOptimization}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 font-medium text-white bg-[#059669] hover:bg-emerald-700 rounded-md"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Confirm &amp; Apply Optimizations</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div
            role="group"
            aria-label="Filter expenses by payment status"
            className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
          >
            {(['All', 'Paid', 'Pending', 'Unpaid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                aria-pressed={budgetFilter === st}
                onClick={() => setBudgetFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  budgetFilter === st
                    ? 'bg-white text-[#1E1B4B] shadow-xs font-semibold'
                    : 'text-slate-600'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Filter expenses by title or category"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter expenses..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Editable Budget Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th scope="col" className="py-3 px-4 font-medium">
                    Category &amp; Expense Item
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-right">
                    Planned ({activeEvent.currency})
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-right">
                    Quoted ({activeEvent.currency})
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-right">
                    Actual Paid ({activeEvent.currency})
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-right">
                    Est. Low–High Range
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium">
                    Payment
                  </th>
                  <th scope="col" className="py-3 px-4 font-medium text-right">
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-slate-500">
                        {item.category} {item.notes ? `· ${item.notes}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        aria-label={`Planned amount for ${item.title}`}
                        disabled={isReadOnly}
                        value={item.plannedAmount}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          onUpdateBudgetItem({
                            ...item,
                            plannedAmount: val,
                          });
                        }}
                        className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        aria-label={`Quoted amount for ${item.title}`}
                        disabled={isReadOnly}
                        value={item.quotedAmount}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          onUpdateBudgetItem({
                            ...item,
                            quotedAmount: val,
                          });
                        }}
                        className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        aria-label={`Actual paid amount for ${item.title}`}
                        disabled={isReadOnly}
                        value={item.actualAmount}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          onUpdateBudgetItem({
                            ...item,
                            actualAmount: val,
                          });
                        }}
                        className="w-24 text-right px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-200 rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                      {formatCurrency(item.lowEstimate, activeEvent.currency)} –{' '}
                      {formatCurrency(item.highEstimate, activeEvent.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Payment status for ${item.title}`}
                        disabled={isReadOnly}
                        value={item.paymentStatus}
                        onChange={(e) => {
                          onUpdateBudgetItem({
                            ...item,
                            paymentStatus: e.target
                              .value as BudgetExpenseItem['paymentStatus'],
                          });
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 rounded"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => onDeleteBudgetItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        aria-label={`Delete ${item.title} expense`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New Expense Item */}
          {!isReadOnly && (
            <form
              onSubmit={handleExpenseSubmit}
              aria-label="Add new budget expense item"
              className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-center"
            >
              <input
                type="text"
                aria-label="New expense category"
                value={newExpense.category}
                onChange={(e) =>
                  setNewExpense((p) => ({
                    ...p,
                    category: e.target.value,
                  }))
                }
                placeholder="Category"
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
              <input
                type="text"
                required
                aria-label="New expense title"
                value={newExpense.title}
                onChange={(e) =>
                  setNewExpense((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="New expense title..."
                className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
              <input
                type="number"
                required
                aria-label="New expense planned amount"
                value={newExpense.plannedAmount}
                onChange={(e) =>
                  setNewExpense((p) => ({
                    ...p,
                    plannedAmount: e.target.value,
                  }))
                }
                placeholder="Planned amount"
                className="px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
              <input
                type="number"
                aria-label="New expense paid amount"
                value={newExpense.actualAmount}
                onChange={(e) =>
                  setNewExpense((p) => ({
                    ...p,
                    actualAmount: e.target.value,
                  }))
                }
                placeholder="Paid amount"
                className="px-3 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E1B4B] rounded-md"
              >
                + Add Expense
              </button>
            </form>
          )}
        </div>
      </section>
    );
  }
);
