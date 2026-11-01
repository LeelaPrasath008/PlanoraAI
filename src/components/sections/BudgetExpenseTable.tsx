import React, { useId } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { BudgetItem, PaymentStatus } from '../../types/event';
import { formatCurrency } from '../../utils/budgetCalculations';

export interface BudgetExpenseTableProps {
  filteredBudgetItems: BudgetItem[];
  allCategories: string[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
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
}

/**
 * Renders the add-expense form (with linked `<label htmlFor>` + `id`) and the
 * accessible editable budget ledger table (`<caption>`, `scope="col"`, `scope="row"`).
 */
export const BudgetExpenseTable: React.FC<BudgetExpenseTableProps> = ({
  filteredBudgetItems,
  allCategories,
  selectedCategory,
  onSelectCategory,
  newItem,
  onSetNewItem,
  onAddBudgetItem,
  onUpdateBudgetItemField,
  onDeleteBudgetItem,
}) => {
  const uid = useId();
  const catInputId = `${uid}-cat`;
  const titleInputId = `${uid}-title`;
  const plannedInputId = `${uid}-planned`;
  const actualInputId = `${uid}-actual`;
  const statusSelectId = `${uid}-status`;

  return (
    <>
      {/* Add New Budget Item Form */}
      <form
        onSubmit={onAddBudgetItem}
        aria-label="Add Budget Expense Line Item"
        className="bg-white border border-[#E6DFD3] rounded-2xl p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-[#1F1C18]">
            Add Budget Expense Line Item
          </h3>
          {selectedCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="text-xs font-semibold text-[#B8860B] hover:underline"
            >
              Showing Category: {selectedCategory} (Reset Filter)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label
              htmlFor={catInputId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Category
            </label>
            <input
              id={catInputId}
              type="text"
              value={newItem.category}
              onChange={(e) =>
                onSetNewItem((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="e.g., Catering & Bar"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
            />
          </div>
          <div className="lg:col-span-2">
            <label
              htmlFor={titleInputId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Expense Item Title
            </label>
            <input
              id={titleInputId}
              type="text"
              value={newItem.title}
              onChange={(e) =>
                onSetNewItem((p) => ({ ...p, title: e.target.value }))
              }
              required
              aria-required="true"
              placeholder="e.g., Seated Dinner & Beverage Service"
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
            />
          </div>
          <div>
            <label
              htmlFor={plannedInputId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Planned ($)
            </label>
            <input
              id={plannedInputId}
              type="number"
              min={0}
              value={newItem.plannedAmount}
              onChange={(e) =>
                onSetNewItem((p) => ({
                  ...p,
                  plannedAmount: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-mono"
            />
          </div>
          <div>
            <label
              htmlFor={actualInputId}
              className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
            >
              Actual Spent ($)
            </label>
            <input
              id={actualInputId}
              type="number"
              min={0}
              value={newItem.actualAmount}
              onChange={(e) =>
                onSetNewItem((p) => ({
                  ...p,
                  actualAmount: Number(e.target.value),
                }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-mono"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label
                htmlFor={statusSelectId}
                className="block text-xs font-mono uppercase text-[#6E655A] mb-1"
              >
                Status
              </label>
              <select
                id={statusSelectId}
                value={newItem.paymentStatus}
                onChange={(e) =>
                  onSetNewItem((p) => ({
                    ...p,
                    paymentStatus: e.target.value as PaymentStatus,
                  }))
                }
                className="w-full px-2.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
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

      {/* Editable Budget Ledger Table */}
      <div className="bg-white border border-[#E6DFD3] rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E6DFD3] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F1C18]">
              Line-Item Budget Ledger ({filteredBudgetItems.length} items)
            </h3>
            <p className="text-xs text-[#6E655A]">
              Edit planned, quoted, or actual figures inline; totals and
              variance recalculate live.
            </p>
          </div>
          <div
            role="group"
            aria-label="Filter budget items by category"
            className="flex flex-wrap gap-1.5"
          >
            <button
              type="button"
              aria-pressed={selectedCategory === null}
              onClick={() => onSelectCategory(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[28px] ${
                selectedCategory === null
                  ? 'bg-[#1F1C18] text-white'
                  : 'bg-[#FAF7F2] text-[#6E655A] hover:text-[#1F1C18]'
              }`}
            >
              All ({allCategories.length} categories)
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() =>
                  onSelectCategory(selectedCategory === cat ? null : cat)
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors min-h-[28px] ${
                  selectedCategory === cat
                    ? 'bg-[#1F1C18] text-white'
                    : 'bg-[#FAF7F2] text-[#6E655A] hover:text-[#1F1C18]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">
              Editable line-item budget ledger with planned, quoted, actual, and
              variance amounts
            </caption>
            <thead>
              <tr className="bg-[#FAF7F2] border-b border-[#E6DFD3] text-xs font-mono uppercase tracking-wider text-[#6E655A]">
                <th scope="col" className="py-3 px-4">
                  Category &amp; Line Item
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Market Range
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Planned ($)
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Quoted ($)
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Actual ($)
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Variance
                </th>
                <th scope="col" className="py-3 px-3 text-center">
                  Payment
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD3] text-xs">
              {filteredBudgetItems.map((item) => {
                const variance =
                  item.actualAmount > 0
                    ? item.actualAmount - item.plannedAmount
                    : 0;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[#FAF7F2]/60 transition-colors"
                  >
                    <th scope="row" className="py-3 px-4 font-normal">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#B8860B] font-semibold block">
                        {item.category}
                      </span>
                      <input
                        type="text"
                        aria-label={`Line item title for ${item.title}`}
                        value={item.title}
                        onChange={(e) =>
                          onUpdateBudgetItemField(
                            item.id,
                            'title',
                            e.target.value
                          )
                        }
                        className="font-semibold text-[#1F1C18] bg-transparent border-b border-transparent focus:border-[#22D3EE] focus:outline-none w-full py-0.5"
                      />
                      {item.notes && (
                        <p className="text-xs text-[#6E655A] mt-0.5 line-clamp-1">
                          {item.notes}
                        </p>
                      )}
                    </th>
                    <td className="py-3 px-3 text-right font-mono text-xs text-[#6E655A] whitespace-nowrap">
                      {formatCurrency(item.lowEstimate)} –{' '}
                      {formatCurrency(item.highEstimate)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Planned amount for ${item.title}`}
                        value={item.plannedAmount}
                        onChange={(e) =>
                          onUpdateBudgetItemField(
                            item.id,
                            'plannedAmount',
                            Number(e.target.value)
                          )
                        }
                        className="w-24 text-right font-mono font-semibold text-[#1F1C18] px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3]"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Quoted amount for ${item.title}`}
                        value={item.quotedAmount}
                        onChange={(e) =>
                          onUpdateBudgetItemField(
                            item.id,
                            'quotedAmount',
                            Number(e.target.value)
                          )
                        }
                        className="w-24 text-right font-mono text-[#6E655A] px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3]"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Actual amount for ${item.title}`}
                        value={item.actualAmount}
                        onChange={(e) =>
                          onUpdateBudgetItemField(
                            item.id,
                            'actualAmount',
                            Number(e.target.value)
                          )
                        }
                        className="w-24 text-right font-mono font-semibold text-[#34D399] px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E6DFD3]"
                      />
                    </td>
                    <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                      {item.actualAmount === 0 ? (
                        <span className="text-[#6E655A]">—</span>
                      ) : variance > 0 ? (
                        <span className="text-[#F87171] font-semibold">
                          +{formatCurrency(variance)}
                        </span>
                      ) : (
                        <span className="text-[#34D399] font-semibold">
                          {formatCurrency(variance)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <select
                        aria-label={`Payment status for ${item.title}`}
                        value={item.paymentStatus}
                        onChange={(e) =>
                          onUpdateBudgetItemField(
                            item.id,
                            'paymentStatus',
                            e.target.value
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          item.paymentStatus === 'Paid'
                            ? 'bg-[#2E5A44]/15 text-[#34D399] border-[#2E5A44]/30'
                            : item.paymentStatus === 'Partial'
                            ? 'bg-[#D97706]/15 text-[#FBBF24] border-[#D97706]/30'
                            : 'bg-[#FAF7F2] text-[#CBD5E1] border-[#E6DFD3]'
                        }`}
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteBudgetItem(item.id)}
                        aria-label={`Delete budget item ${item.title}`}
                        className="p-2 rounded-lg text-[#CBD5E1] hover:text-[#F87171] hover:bg-[#A63A2B]/10 transition-colors min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
export { Check };
