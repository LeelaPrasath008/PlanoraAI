/**
 * Shared domain types between Planora AI client and server.
 */

export type EventType =
  | 'Wedding'
  | 'Birthday'
  | 'Anniversary'
  | 'College Event'
  | 'Festival'
  | 'Community'
  | string;

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type VenuePreference = 'Indoor' | 'Outdoor' | 'Hybrid' | string;

export type EventStatus = 'active' | 'archived' | 'completed';

export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Pending';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type TaskStatus = 'Todo' | 'In Progress' | 'Done' | 'Completed';

export type BookingStatus =
  | 'Shortlisted'
  | 'Contacted'
  | 'Negotiating'
  | 'Booked'
  | 'Declined'
  | 'Inquiry Sent'
  | 'Quoted';

export type WorkspaceSection =
  | 'portfolio'
  | 'dashboard'
  | 'overview'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'ideas'
  | 'simulator'
  | 'copilot'
  | 'export';

export type CopilotChangeType =
  | 'update_budget_total'
  | 'update_guest_count'
  | 'scale_budget_items'
  | 'add_budget_item'
  | 'add_task'
  | 'add_vendor'
  | 'add_idea';

export interface BudgetItem {
  id: string;
  eventId?: string;
  ownerId?: string;
  category: string;
  title: string;
  plannedAmount: number;
  quotedAmount: number;
  actualAmount: number;
  lowEstimate: number;
  highEstimate: number;
  paymentStatus: PaymentStatus;
  dueDate?: string;
  notes: string;
}

export type BudgetExpenseItem = BudgetItem;

export interface TimelineTask {
  id: string;
  eventId?: string;
  ownerId?: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  durationDays?: number;
  priority: TaskPriority;
  category: string;
  status: TaskStatus;
  dependsOnTaskId?: string;
  assignee: string;
}

export type PlanoraTask = TimelineTask;

export interface VendorItem {
  id: string;
  eventId?: string;
  ownerId?: string;
  category: string;
  vendorName: string;
  contactInfo: string;
  estimatedPrice: number;
  quotedAmount: number;
  bookingStatus: BookingStatus;
  followUpDate: string;
  notes: string;
  isAiSuggestion?: boolean;
}

export type PlanoraVendor = VendorItem;

export interface CreativeIdea {
  id: string;
  eventId?: string;
  ownerId?: string;
  category: string;
  title: string;
  description: string;
  estimatedCostImpact: string;
  executionTip: string;
}

export type PlanoraIdea = CreativeIdea;

export interface SavedScenario {
  id: string;
  name: string;
  guestCount: number;
  totalBudget: number;
  venueTier: 'Budget' | 'Standard' | 'Premium';
  cateringStyle: 'Buffet' | 'Plated' | 'Cocktail';
  decorLevel: 'Minimal' | 'Curated' | 'Luxury';
  estimatedTotalCost: number;
  summaryNotes: string;
}

export interface CopilotChangePayload {
  newTotalBudget?: number;
  newGuestCount?: number;
  scaleCateringFactor?: number;
  scaleFactor?: number;
  excludeCategory?: string;
  category?: string;
  title?: string;
  plannedAmount?: number;
  notes?: string;
  description?: string;
  dueDate?: string;
  priority?: 'High' | 'Medium' | 'Low';
  vendorName?: string;
  estimatedPrice?: number;
  estimatedCostImpact?: string;
  executionTip?: string;
}

export interface ProposedCopilotChange {
  type: CopilotChangeType;
  summaryLabel: string;
  payload: CopilotChangePayload;
}

export interface CopilotChatMessage {
  id: string;
  eventId?: string;
  ownerId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  suggestedActionLabel?: string;
  proposedChanges?: ProposedCopilotChange[];
  applied?: boolean;
}

export interface PlanoraEvent {
  id: string;
  ownerId?: string;
  isDemo?: boolean;
  title: string;
  type: string;
  date: string; // YYYY-MM-DD
  location: string;
  venuePreference: string;
  guestCount: number;
  totalBudget: number;
  contingencyPercent: number;
  notes: string;
  priorities: string[];
  aiConceptSummary: string;
  aiRisksAndContingencies: string;
  budgetItems: BudgetItem[];
  tasks: TimelineTask[];
  vendors: VendorItem[];
  ideas: CreativeIdea[];
  savedScenarios: SavedScenario[];
  updatedAt: string;
  description?: string;
  eventType?: EventType;
  eventDate?: string;
  durationHours?: number;
  city?: string;
  currency?: CurrencyCode;
  themeStyle?: string;
  foodPreference?: string;
  culturalNotes?: string;
  mustHaves?: string;
  avoidItems?: string;
  status?: EventStatus;
  isShared?: boolean;
  shareToken?: string;
  messages?: CopilotChatMessage[];
}

export interface GeneratePlanPayload {
  type?: string;
  eventType?: string;
  title?: string;
  description?: string;
  date?: string;
  eventDate?: string;
  durationHours?: number;
  location?: string;
  city?: string;
  guestCount?: number;
  totalBudget?: number;
  currency?: string;
  contingencyPercent?: number;
  venuePreference?: string;
  themeStyle?: string;
  foodPreference?: string;
  culturalNotes?: string;
  notes?: string;
  mustHaves?: string;
  avoidItems?: string;
  priorities?: string | string[];
}

export interface ServerBudgetItemInput {
  id?: string;
  category?: string;
  title?: string;
  plannedAmount?: number;
  actualAmount?: number;
}

export interface ServerVendorInput {
  category?: string;
  vendorName?: string;
  estimatedPrice?: number;
  quotedAmount?: number;
}

export interface ServerEventInput {
  title?: string;
  type?: string;
  eventType?: string;
  date?: string;
  eventDate?: string;
  location?: string;
  city?: string;
  venuePreference?: string;
  guestCount?: number;
  totalBudget?: number;
  currency?: string;
  contingencyPercent?: number;
  priorities?: string | string[];
  mustHaves?: string;
  foodPreference?: string;
  budgetItems?: ServerBudgetItemInput[];
  tasks?: unknown[];
  vendors?: ServerVendorInput[];
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};
