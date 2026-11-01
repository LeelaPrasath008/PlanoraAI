import { PlanoraEvent, BudgetItem } from '../types/event';

export interface CategorySummary {
  category: string;
  planned: number;
  quoted: number;
  actual: number;
  sharePercent: number;
  variance: number;
}

export interface BudgetMetrics {
  totalBudget: number;
  contingencyPercent: number;
  contingencyAmount: number;
  usableBudget: number;
  totalPlanned: number;
  totalQuoted: number;
  totalActual: number;
  remainingUsable: number;
  remainingTotal: number;
  costPerGuestPlanned: number;
  costPerGuestActual: number;
  isOverAllocated: boolean;
  isOverActual: boolean;
  overAllocatedAmount: number;
  categoryBreakdown: CategorySummary[];
  healthStatus: 'Healthy' | 'Tight' | 'Over Allocated';
  paidTotal: number;
  unpaidTotal: number;
}

/**
 * Computes comprehensive financial metrics, category breakdowns, and health status
 * for a given `PlanoraEvent`.
 * @param event Event containing budget items, guest count, total budget, and contingency percentage.
 * @returns Calculated `BudgetMetrics`.
 */
export function calculateBudgetMetrics(event: PlanoraEvent): BudgetMetrics {
  const totalBudget = Math.max(0, Number(event.totalBudget) || 0);
  const contingencyPercent = Math.min(100, Math.max(0, Number(event.contingencyPercent) || 0));
  const contingencyAmount = Math.round(totalBudget * (contingencyPercent / 100));
  const usableBudget = Math.max(0, totalBudget - contingencyAmount);

  const totalPlanned = event.budgetItems.reduce(
    (sum, item) => sum + (Number(item.plannedAmount) || 0),
    0
  );
  const totalQuoted = event.budgetItems.reduce(
    (sum, item) => sum + (Number(item.quotedAmount) || 0),
    0
  );
  const totalActual = event.budgetItems.reduce(
    (sum, item) => sum + (Number(item.actualAmount) || 0),
    0
  );

  const paidTotal = event.budgetItems
    .filter((i) => i.paymentStatus === 'Paid')
    .reduce((sum, i) => sum + (Number(i.actualAmount) || Number(i.plannedAmount) || 0), 0);

  const unpaidTotal = Math.max(0, totalPlanned - paidTotal);

  const remainingUsable = usableBudget - totalPlanned;
  const remainingTotal = totalBudget - totalActual;

  const guestCount = Math.max(1, Number(event.guestCount) || 1);
  const costPerGuestPlanned = Math.round(totalPlanned / guestCount);
  const costPerGuestActual = Math.round(totalActual / guestCount);

  const isOverAllocated = totalPlanned > usableBudget;
  const isOverActual = totalActual > totalBudget;
  const overAllocatedAmount = Math.max(0, totalPlanned - usableBudget);

  const categoryMap = new Map<
    string,
    { planned: number; quoted: number; actual: number }
  >();

  for (const item of event.budgetItems) {
    const cat = item.category.trim() || 'Uncategorized';
    const existing = categoryMap.get(cat) || { planned: 0, quoted: 0, actual: 0 };
    existing.planned += Number(item.plannedAmount) || 0;
    existing.quoted += Number(item.quotedAmount) || 0;
    existing.actual += Number(item.actualAmount) || 0;
    categoryMap.set(cat, existing);
  }

  const categoryBreakdown: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, vals]) => ({
      category,
      planned: vals.planned,
      quoted: vals.quoted,
      actual: vals.actual,
      sharePercent: totalPlanned > 0 ? (vals.planned / totalPlanned) * 100 : 0,
      variance: vals.actual > 0 ? vals.actual - vals.planned : 0,
    }))
    .sort((a, b) => b.planned - a.planned);

  let healthStatus: 'Healthy' | 'Tight' | 'Over Allocated' = 'Healthy';
  if (isOverAllocated || isOverActual) {
    healthStatus = 'Over Allocated';
  } else if (usableBudget > 0 && totalPlanned / usableBudget >= 0.92) {
    healthStatus = 'Tight';
  }

  return {
    totalBudget,
    contingencyPercent,
    contingencyAmount,
    usableBudget,
    totalPlanned,
    totalQuoted,
    totalActual,
    remainingUsable,
    remainingTotal,
    costPerGuestPlanned,
    costPerGuestActual,
    isOverAllocated,
    isOverActual,
    overAllocatedAmount,
    categoryBreakdown,
    healthStatus,
    paidTotal,
    unpaidTotal,
  };
}

/**
 * Deterministic client-side budget rebalancer that proportionally scales unlocked
 * budget line items so total planned allocation fits within the usable budget.
 * @param items Current budget items.
 * @param targetUsableBudget Target usable budget after contingency reserve.
 * @param lockedCategories Optional list of category names that must not be scaled.
 * @returns Rebalanced list of `BudgetItem` records.
 */
export function rebalanceBudgetToTarget(
  items: BudgetItem[],
  targetUsableBudget: number,
  lockedCategories: string[] = []
): BudgetItem[] {
  const lockedSet = new Set(lockedCategories.map((c) => c.toLowerCase()));

  const lockedSum = items
    .filter((i) => lockedSet.has(i.category.toLowerCase()))
    .reduce((s, i) => s + i.plannedAmount, 0);

  const unlockedSum = items
    .filter((i) => !lockedSet.has(i.category.toLowerCase()))
    .reduce((s, i) => s + i.plannedAmount, 0);

  const availableForUnlocked = Math.max(0, targetUsableBudget - lockedSum);

  if (unlockedSum <= 0) return items;

  const scaleFactor = availableForUnlocked / unlockedSum;

  return items.map((item) => {
    if (lockedSet.has(item.category.toLowerCase())) {
      return item;
    }
    const newPlanned = Math.max(50, Math.round((item.plannedAmount * scaleFactor) / 10) * 10);
    return {
      ...item,
      plannedAmount: newPlanned,
      lowEstimate: Math.round(newPlanned * 0.85),
      highEstimate: Math.round(newPlanned * 1.15),
    };
  });
}

/**
 * Formats a number as a whole-dollar USD currency string (e.g., `$25,000`).
 * @param amount Dollar amount to format.
 */
export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(safe);
}
