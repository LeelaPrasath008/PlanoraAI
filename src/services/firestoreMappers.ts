import {
  PlanoraEvent,
  BudgetItem,
  TimelineTask,
  VendorItem,
  CreativeIdea,
  SavedScenario,
  BookingStatus,
  PaymentStatus,
  TaskPriority,
  TaskStatus,
} from '../types/event';

const VALID_PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Partial', 'Paid'];
const VALID_TASK_PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];
const VALID_TASK_STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'Done'];
const VALID_BOOKING_STATUSES: BookingStatus[] = [
  'Shortlisted',
  'Contacted',
  'Negotiating',
  'Booked',
  'Declined',
];

/**
 * Sanitizes an unknown input string to a bounded trimmed string with fallback.
 * @param val Input value to sanitize.
 * @param maxLen Maximum character length.
 * @param fallback Fallback string if input is empty or non-string.
 */
export function sanitizeString(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val.trim() : '';
  const result = str || fallback;
  return result.slice(0, maxLen);
}

/**
 * Clamps an unknown numeric value to [min, max] with a safe fallback.
 * @param val Unknown numeric input.
 * @param min Minimum allowed number.
 * @param max Maximum allowed number.
 * @param fallback Default value when input is NaN/non-numeric.
 */
export function clampNumber(
  val: unknown,
  min: number,
  max: number,
  fallback = min
): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

/**
 * Validates whether an email string satisfies standard email format and length bounds.
 * @param email Email address string.
 */
export function isValidEmail(email: string): boolean {
  return (
    email.length >= 3 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

/**
 * Maps a raw Firestore event document into a typed `PlanoraEvent`.
 * @param id Firestore document ID.
 * @param data Raw document fields.
 */
export function mapDocToEvent(id: string, data: Record<string, unknown>): PlanoraEvent {
  return {
    id,
    title: sanitizeString(data.title, 200, 'Untitled Event'),
    type: sanitizeString(data.type, 100, 'Event'),
    date: sanitizeString(data.date, 40, new Date().toISOString().split('T')[0]),
    location: sanitizeString(data.location, 200, 'TBD'),
    venuePreference: sanitizeString(data.venuePreference, 100, 'Indoor'),
    guestCount: clampNumber(data.guestCount, 1, 100000, 50),
    totalBudget: clampNumber(data.totalBudget, 0, 1000000000, 10000),
    contingencyPercent: clampNumber(data.contingencyPercent, 0, 100, 10),
    notes: sanitizeString(data.notes, 2000, ''),
    priorities: Array.isArray(data.priorities)
      ? data.priorities
          .slice(0, 20)
          .map((p) => sanitizeString(p, 100))
          .filter(Boolean)
      : [],
    aiConceptSummary: sanitizeString(data.aiConceptSummary, 5000, ''),
    aiRisksAndContingencies: sanitizeString(data.aiRisksAndContingencies, 5000, ''),
    budgetItems: [],
    tasks: [],
    vendors: [],
    ideas: [],
    savedScenarios: [],
    updatedAt: sanitizeString(data.updatedAt, 60, new Date().toISOString()),
  };
}

/**
 * Maps a raw Firestore budget item document into a typed `BudgetItem`.
 * @param id Firestore document ID.
 * @param data Raw document fields.
 */
export function mapDocToBudgetItem(
  id: string,
  data: Record<string, unknown>
): BudgetItem {
  const paymentStatus = VALID_PAYMENT_STATUSES.includes(
    data.paymentStatus as PaymentStatus
  )
    ? (data.paymentStatus as PaymentStatus)
    : 'Unpaid';
  return {
    id,
    category: sanitizeString(data.category, 100, 'General'),
    title: sanitizeString(data.title, 200, 'Expense Item'),
    plannedAmount: clampNumber(data.plannedAmount, 0, 1000000000, 0),
    quotedAmount: clampNumber(data.quotedAmount, 0, 1000000000, 0),
    actualAmount: clampNumber(data.actualAmount, 0, 1000000000, 0),
    lowEstimate: clampNumber(data.lowEstimate, 0, 1000000000, 0),
    highEstimate: clampNumber(data.highEstimate, 0, 1000000000, 0),
    paymentStatus,
    dueDate: data.dueDate ? sanitizeString(data.dueDate, 40) : undefined,
    notes: sanitizeString(data.notes, 1000, ''),
  };
}

/**
 * Maps a raw Firestore task document into a typed `TimelineTask`.
 * @param id Firestore document ID.
 * @param data Raw document fields.
 */
export function mapDocToTask(id: string, data: Record<string, unknown>): TimelineTask {
  const priority = VALID_TASK_PRIORITIES.includes(data.priority as TaskPriority)
    ? (data.priority as TaskPriority)
    : 'Medium';
  const status = VALID_TASK_STATUSES.includes(data.status as TaskStatus)
    ? (data.status as TaskStatus)
    : 'Todo';
  return {
    id,
    title: sanitizeString(data.title, 200, 'Task'),
    description: sanitizeString(data.description, 1000, ''),
    dueDate: sanitizeString(data.dueDate, 40, ''),
    durationDays:
      data.durationDays !== undefined
        ? clampNumber(data.durationDays, 1, 365, 5)
        : undefined,
    priority,
    category: sanitizeString(data.category, 100, 'General'),
    status,
    assignee: sanitizeString(data.assignee, 100, ''),
    dependsOnTaskId: data.dependsOnTaskId
      ? sanitizeString(data.dependsOnTaskId, 100)
      : undefined,
  };
}

/**
 * Maps a raw Firestore vendor document into a typed `VendorItem`.
 * @param id Firestore document ID.
 * @param data Raw document fields.
 */
export function mapDocToVendor(id: string, data: Record<string, unknown>): VendorItem {
  const bookingStatus = VALID_BOOKING_STATUSES.includes(
    data.bookingStatus as BookingStatus
  )
    ? (data.bookingStatus as BookingStatus)
    : 'Shortlisted';
  return {
    id,
    category: sanitizeString(data.category, 100, 'General'),
    vendorName: sanitizeString(data.vendorName, 200, 'Vendor'),
    contactInfo: sanitizeString(data.contactInfo, 300, ''),
    estimatedPrice: clampNumber(data.estimatedPrice, 0, 1000000000, 0),
    quotedAmount: clampNumber(data.quotedAmount, 0, 1000000000, 0),
    bookingStatus,
    followUpDate: sanitizeString(data.followUpDate, 40, ''),
    notes: sanitizeString(data.notes, 1000, ''),
  };
}

/**
 * Maps a raw Firestore creative idea document into a typed `CreativeIdea`.
 * @param id Firestore document ID.
 * @param data Raw document fields.
 */
export function mapDocToIdea(id: string, data: Record<string, unknown>): CreativeIdea {
  return {
    id,
    category: sanitizeString(data.category, 100, 'General'),
    title: sanitizeString(data.title, 200, 'Idea'),
    description: sanitizeString(data.description, 1000, ''),
    estimatedCostImpact: sanitizeString(data.estimatedCostImpact, 200, ''),
    executionTip: sanitizeString(data.executionTip, 1000, ''),
  };
}

/**
 * Maps a raw Firestore scenario document into a typed `SavedScenario`.
 * @param id Firestore document ID.
 * @param data Raw document fields.
 */
export function mapDocToScenario(
  id: string,
  data: Record<string, unknown>
): SavedScenario {
  return {
    id,
    name: sanitizeString(data.name, 200, 'Scenario'),
    guestCount: clampNumber(data.guestCount, 1, 100000, 50),
    totalBudget: clampNumber(data.totalBudget, 0, 1000000000, 10000),
    venueTier:
      data.venueTier === 'Budget' ||
      data.venueTier === 'Premium' ||
      data.venueTier === 'Standard'
        ? data.venueTier
        : 'Standard',
    cateringStyle:
      data.cateringStyle === 'Buffet' ||
      data.cateringStyle === 'Cocktail' ||
      data.cateringStyle === 'Plated'
        ? data.cateringStyle
        : 'Plated',
    decorLevel:
      data.decorLevel === 'Minimal' ||
      data.decorLevel === 'Luxury' ||
      data.decorLevel === 'Curated'
        ? data.decorLevel
        : 'Curated',
    estimatedTotalCost: clampNumber(data.estimatedTotalCost, 0, 1000000000, 0),
    summaryNotes: sanitizeString(data.summaryNotes, 1000, ''),
  };
}
