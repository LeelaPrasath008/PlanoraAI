import {
  BudgetExpenseItem,
  PlanoraEvent,
  PlanoraIdea,
  PlanoraTask,
  PlanoraVendor,
  ProposedCopilotChange,
  VenuePreference,
} from '../types/event';

export interface BudgetSummaryMetrics {
  plannedTotal: number;
  quotedTotal: number;
  actualTotal: number;
  lowRangeTotal: number;
  highRangeTotal: number;
  paidTotal: number;
  pendingTotal: number;
  contingencyAmount: number;
  usableBudget: number;
  remainingBudget: number;
  utilizationPct: number;
  perGuestPlanned: number;
  perGuestTotalBudget: number;
  isOverspent: boolean;
}

export type CateringTier =
  | 'Essential (-18%)'
  | 'Signature (Baseline)'
  | 'Luxury (+25%)';

export interface SimulatedBudgetItem extends BudgetExpenseItem {
  simulatedPlanned: number;
  delta: number;
}

export interface ScenarioComparisonResult {
  simulatedItems: SimulatedBudgetItem[];
  currentTotalPlanned: number;
  currentContingency: number;
  currentRemaining: number;
  projectedTotalSpend: number;
  projectedContingency: number;
  projectedRemaining: number;
  dayShift: number;
}

export interface BudgetOptimizationAdjustment {
  id: string;
  category: string;
  title: string;
  currentPlanned: number;
  recommendedPlanned: number;
  rationale: string;
}

/**
 * Computes deterministic financial metrics for an event plan.
 */
export function calculateBudgetSummary(
  event: Pick<
    PlanoraEvent,
    'budgetItems' | 'totalBudget' | 'contingencyPercent' | 'guestCount'
  >
): BudgetSummaryMetrics {
  const safeTotalBudget = Math.max(0, Number(event.totalBudget) || 0);
  const safeGuestCount = Math.max(1, Number(event.guestCount) || 1);
  const safeContingencyPct = Math.min(
    50,
    Math.max(0, Number(event.contingencyPercent) || 0)
  );

  let plannedTotal = 0;
  let quotedTotal = 0;
  let actualTotal = 0;
  let lowRangeTotal = 0;
  let highRangeTotal = 0;
  let paidTotal = 0;
  let pendingTotal = 0;

  for (const item of event.budgetItems) {
    const planned = Math.max(0, Number(item.plannedAmount) || 0);
    const quoted = Math.max(0, Number(item.quotedAmount) || 0);
    const actual = Math.max(0, Number(item.actualAmount) || 0);
    const low = Math.max(0, Number(item.lowEstimate) || planned);
    const high = Math.max(0, Number(item.highEstimate) || planned);

    plannedTotal += planned;
    quotedTotal += quoted;
    actualTotal += actual;
    lowRangeTotal += low;
    highRangeTotal += high;

    if (item.paymentStatus === 'Paid') {
      paidTotal += actual;
    } else if (item.paymentStatus === 'Pending') {
      const targetObligation = quoted > 0 ? quoted : planned;
      pendingTotal += Math.max(0, targetObligation - actual);
    }
  }

  const contingencyAmount = Math.round(
    safeTotalBudget * (safeContingencyPct / 100)
  );
  const usableBudget = safeTotalBudget - contingencyAmount;
  const remainingBudget = safeTotalBudget - plannedTotal - contingencyAmount;
  const utilizationPct = Math.round(
    ((plannedTotal + contingencyAmount) / Math.max(1, safeTotalBudget)) * 100
  );
  const isOverspent = remainingBudget < 0 || quotedTotal > usableBudget;

  return {
    plannedTotal,
    quotedTotal,
    actualTotal,
    lowRangeTotal,
    highRangeTotal,
    paidTotal,
    pendingTotal,
    contingencyAmount,
    usableBudget,
    remainingBudget,
    utilizationPct,
    perGuestPlanned: Math.round(plannedTotal / safeGuestCount),
    perGuestTotalBudget: Math.round(safeTotalBudget / safeGuestCount),
    isOverspent,
  };
}

/**
 * Computes deterministic "What If?" scenario comparison metrics.
 */
export function simulateEventScenario(
  event: PlanoraEvent,
  params: {
    simGuests: number;
    simBudget: number;
    simDate: string;
    simVenue: VenuePreference;
    cateringTier: CateringTier;
  }
): ScenarioComparisonResult {
  const safeBaseGuests = Math.max(1, Number(event.guestCount) || 1);
  const safeSimGuests = Math.max(1, Number(params.simGuests) || safeBaseGuests);
  const safeSimBudget = Math.max(0, Number(params.simBudget) || 0);
  const guestRatio = safeSimGuests / safeBaseGuests;

  const tierMultiplier =
    params.cateringTier === 'Essential (-18%)'
      ? 0.82
      : params.cateringTier === 'Luxury (+25%)'
      ? 1.25
      : 1.0;

  const venueMultiplier =
    params.simVenue === event.venuePreference
      ? 1.0
      : params.simVenue === 'Outdoor'
      ? 1.08
      : params.simVenue === 'Indoor'
      ? 0.96
      : 1.04;

  const simulatedItems: SimulatedBudgetItem[] = event.budgetItems.map(
    (item) => {
      const catLower = item.category.toLowerCase();
      let newPlanned = Number(item.plannedAmount) || 0;

      if (
        catLower.includes('catering') ||
        catLower.includes('food') ||
        catLower.includes('invitation')
      ) {
        newPlanned = Math.round(newPlanned * guestRatio * tierMultiplier);
      } else if (catLower.includes('venue') || catLower.includes('rental')) {
        const capacityFactor = 1 + (guestRatio - 1) * 0.45;
        newPlanned = Math.round(
          newPlanned * Math.max(0.6, capacityFactor) * venueMultiplier
        );
      } else if (catLower.includes('decor')) {
        const decorFactor = 1 + (guestRatio - 1) * 0.25;
        newPlanned = Math.round(
          newPlanned * Math.max(0.7, decorFactor) * venueMultiplier
        );
      }

      const clampedPlanned = Math.max(0, newPlanned);
      return {
        ...item,
        simulatedPlanned: clampedPlanned,
        delta: clampedPlanned - (Number(item.plannedAmount) || 0),
      };
    }
  );

  const currentTotalPlanned = event.budgetItems.reduce(
    (sum, i) => sum + (Number(i.plannedAmount) || 0),
    0
  );
  const currentContingency = Math.round(
    event.totalBudget * (Math.max(0, event.contingencyPercent) / 100)
  );
  const currentRemaining =
    event.totalBudget - currentTotalPlanned - currentContingency;

  const projectedTotalSpend = simulatedItems.reduce(
    (sum, i) => sum + i.simulatedPlanned,
    0
  );
  const projectedContingency = Math.round(
    safeSimBudget * (Math.max(0, event.contingencyPercent) / 100)
  );
  const projectedRemaining =
    safeSimBudget - projectedTotalSpend - projectedContingency;

  const origMs = new Date(event.eventDate).getTime();
  const simMs = new Date(params.simDate).getTime();
  const dayShift =
    Number.isFinite(origMs) && Number.isFinite(simMs)
      ? Math.round((simMs - origMs) / 86400000)
      : 0;

  return {
    simulatedItems,
    currentTotalPlanned,
    currentContingency,
    currentRemaining,
    projectedTotalSpend,
    projectedContingency,
    projectedRemaining,
    dayShift,
  };
}

/**
 * Applies a confirmed AI Budget Optimization preview to an event's budget items.
 */
export function applyBudgetOptimization(
  items: BudgetExpenseItem[],
  adjustments: BudgetOptimizationAdjustment[]
): BudgetExpenseItem[] {
  const map = new Map<string, number>(
    adjustments.map((a) => [a.id, a.recommendedPlanned])
  );
  return items.map((item) => {
    const rec = map.get(item.id);
    if (typeof rec === 'number' && Number.isFinite(rec) && rec >= 0) {
      const rounded = Math.round(rec);
      return {
        ...item,
        plannedAmount: rounded,
        lowEstimate: Math.round(rounded * 0.9),
        highEstimate: Math.round(rounded * 1.15),
      };
    }
    return item;
  });
}

/**
 * Pure reducer that applies a user-confirmed AI Copilot change to an event.
 */
export function applyConfirmedCopilotChange(
  event: PlanoraEvent,
  change: ProposedCopilotChange,
  ownerId: string,
  nowMs: number = Date.now()
): {
  updatedEvent: PlanoraEvent;
  syncMetadata: boolean;
  addedBudgetItem?: BudgetExpenseItem;
  addedTask?: PlanoraTask;
  addedVendor?: PlanoraVendor;
  addedIdea?: PlanoraIdea;
} {
  const p = change.payload || {};

  if (change.type === 'update_budget_total' && p.newTotalBudget) {
    const newTotalBudget = Math.max(100, Number(p.newTotalBudget) || event.totalBudget);
    return {
      updatedEvent: {
        ...event,
        totalBudget: newTotalBudget,
      },
      syncMetadata: true,
    };
  }

  if (change.type === 'update_guest_count' && p.newGuestCount) {
    const newGuestCount = Math.max(1, Math.round(Number(p.newGuestCount) || event.guestCount));
    const ratio = newGuestCount / Math.max(1, event.guestCount);
    const nextBudgetItems = event.budgetItems.map((b) =>
      b.category.toLowerCase().includes('catering')
        ? { ...b, plannedAmount: Math.round(b.plannedAmount * ratio) }
        : b
    );
    return {
      updatedEvent: {
        ...event,
        guestCount: newGuestCount,
        budgetItems: nextBudgetItems,
      },
      syncMetadata: true,
    };
  }

  if (change.type === 'scale_budget_items') {
    const factor = Number(p.scaleFactor) || 0.85;
    const excl = String(p.excludeCategory || 'catering').toLowerCase();
    const nextBudgetItems = event.budgetItems.map((b) =>
      b.category.toLowerCase().includes(excl)
        ? b
        : { ...b, plannedAmount: Math.round(b.plannedAmount * factor) }
    );
    return {
      updatedEvent: {
        ...event,
        budgetItems: nextBudgetItems,
      },
      syncMetadata: false,
    };
  }

  if (change.type === 'add_budget_item') {
    const planned = Math.max(0, Number(p.plannedAmount) || 5000);
    const item: BudgetExpenseItem = {
      id: `b_cp_${nowMs}`,
      eventId: event.id,
      ownerId,
      category: String(p.category || 'Operations'),
      title: String(p.title || change.summaryLabel),
      plannedAmount: planned,
      quotedAmount: 0,
      actualAmount: 0,
      lowEstimate: Math.round(planned * 0.9),
      highEstimate: Math.round(planned * 1.15),
      paymentStatus: 'Unpaid',
      notes: String(p.notes || 'Added via confirmed AI Copilot action'),
    };
    return {
      updatedEvent: {
        ...event,
        budgetItems: [item, ...event.budgetItems],
      },
      syncMetadata: false,
      addedBudgetItem: item,
    };
  }

  if (change.type === 'add_task') {
    const priorityRaw = String(p.priority || 'High');
    const priority: PlanoraTask['priority'] =
      priorityRaw === 'High' || priorityRaw === 'Medium' || priorityRaw === 'Low'
        ? priorityRaw
        : 'High';
    const task: PlanoraTask = {
      id: `t_cp_${nowMs}`,
      eventId: event.id,
      ownerId,
      title: String(p.title || change.summaryLabel),
      description: String(p.description || ''),
      dueDate: String(p.dueDate || event.eventDate),
      durationDays: 7,
      priority,
      category: String(p.category || 'General'),
      status: 'Todo',
      dependsOnTaskId: '',
      assignee: 'Organizer',
    };
    return {
      updatedEvent: {
        ...event,
        tasks: [task, ...event.tasks],
      },
      syncMetadata: false,
      addedTask: task,
    };
  }

  if (change.type === 'add_vendor') {
    const vendor: PlanoraVendor = {
      id: `v_cp_${nowMs}`,
      eventId: event.id,
      ownerId,
      category: String(p.category || 'Vendor'),
      vendorName: String(p.vendorName || change.summaryLabel),
      contactInfo: 'Unverified AI Suggestion',
      estimatedPrice: Math.max(0, Number(p.estimatedPrice) || 10000),
      quotedAmount: 0,
      bookingStatus: 'Shortlisted',
      followUpDate: event.eventDate,
      notes: String(p.notes || ''),
      isAiSuggestion: true,
    };
    return {
      updatedEvent: {
        ...event,
        vendors: [vendor, ...event.vendors],
      },
      syncMetadata: false,
      addedVendor: vendor,
    };
  }

  if (change.type === 'add_idea') {
    const idea: PlanoraIdea = {
      id: `i_cp_${nowMs}`,
      eventId: event.id,
      ownerId,
      category: 'Decor',
      title: String(p.title || change.summaryLabel),
      description: String(p.description || ''),
      estimatedCostImpact: String(p.estimatedCostImpact || 'Within budget'),
      executionTip: String(p.executionTip || ''),
    };
    return {
      updatedEvent: {
        ...event,
        ideas: [idea, ...event.ideas],
      },
      syncMetadata: false,
      addedIdea: idea,
    };
  }

  return { updatedEvent: event, syncMetadata: false };
}
