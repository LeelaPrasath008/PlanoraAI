export type EventType =
  | 'Wedding'
  | 'Birthday'
  | 'Anniversary'
  | 'College Event'
  | 'Festival'
  | 'Community';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type VenuePreference = 'Indoor' | 'Outdoor' | 'Hybrid';

export type EventStatus = 'active' | 'archived' | 'completed';

export type WorkspaceSection =
  | 'dashboard'
  | 'overview'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'ideas'
  | 'simulator'
  | 'copilot'
  | 'export';

export interface BudgetExpenseItem {
  id: string;
  eventId: string;
  ownerId: string;
  category: string;
  title: string;
  plannedAmount: number;
  quotedAmount: number;
  actualAmount: number;
  lowEstimate: number;
  highEstimate: number;
  paymentStatus: 'Paid' | 'Pending' | 'Unpaid';
  notes: string;
}

export interface PlanoraTask {
  id: string;
  eventId: string;
  ownerId: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  durationDays?: number; // Task duration in days (defaults to 7 when omitted)
  priority: 'High' | 'Medium' | 'Low';
  category: string;
  status: 'Todo' | 'In Progress' | 'Completed';
  dependsOnTaskId: string;
  assignee: string;
}

export interface PlanoraVendor {
  id: string;
  eventId: string;
  ownerId: string;
  category:
    | 'Venue'
    | 'Catering'
    | 'Photography'
    | 'Decoration'
    | 'Entertainment'
    | 'Invitations'
    | 'Transport'
    | 'Equipment & Rentals'
    | string;
  vendorName: string;
  contactInfo: string;
  estimatedPrice: number;
  quotedAmount: number;
  bookingStatus:
    | 'Shortlisted'
    | 'Inquiry Sent'
    | 'Quoted'
    | 'Booked'
    | 'Declined';
  followUpDate: string;
  notes: string;
  isAiSuggestion: boolean;
}

export interface PlanoraIdea {
  id: string;
  eventId: string;
  ownerId: string;
  category:
    | 'Decor'
    | 'Food & Beverage'
    | 'Entertainment'
    | 'Invitations'
    | 'Activities';
  title: string;
  description: string;
  estimatedCostImpact: string;
  executionTip: string;
}

export interface ProposedCopilotChange {
  type:
    | 'update_budget_total'
    | 'update_guest_count'
    | 'scale_budget_items'
    | 'add_budget_item'
    | 'add_task'
    | 'add_vendor'
    | 'add_idea';
  summaryLabel: string;
  payload: Record<string, any>;
}

export interface CopilotChatMessage {
  id: string;
  eventId: string;
  ownerId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  suggestedActionLabel?: string;
  proposedChanges?: ProposedCopilotChange[];
  applied?: boolean;
}

export interface PlanoraEvent {
  id: string;
  ownerId: string;
  isDemo?: boolean;
  title: string;
  description: string;
  eventType: EventType;
  eventDate: string; // YYYY-MM-DD
  durationHours: number;
  city: string;
  guestCount: number;
  totalBudget: number;
  currency: CurrencyCode;
  themeStyle: string;
  venuePreference: VenuePreference;
  foodPreference: string;
  culturalNotes: string;
  mustHaves: string;
  avoidItems: string;
  priorities: string; // comma-separated e.g. "Guest Experience, Affordability, Elegance"
  contingencyPercent: number;
  status: EventStatus;
  isShared: boolean;
  shareToken: string;
  aiConceptSummary: string;
  aiRisksAndContingencies: string;
  budgetItems: BudgetExpenseItem[];
  tasks: PlanoraTask[];
  vendors: PlanoraVendor[];
  ideas: PlanoraIdea[];
  messages: CopilotChatMessage[];
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'INR'
): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const safeNum = Number.isFinite(amount) ? Math.round(amount) : 0;
  if (currency === 'INR') {
    return `${symbol}${safeNum.toLocaleString('en-IN')}`;
  }
  return `${symbol}${safeNum.toLocaleString('en-US')}`;
}
