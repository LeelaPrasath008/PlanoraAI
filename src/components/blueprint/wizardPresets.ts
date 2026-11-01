import {
  PlanoraEvent,
  BudgetItem,
  TimelineTask,
  VendorItem,
  CreativeIdea,
} from '../../types/event';
import { inferLogicalDependencies } from '../../utils/taskScheduler';

export const EVENT_TYPES = [
  'Wedding',
  'Corporate Conference',
  'Birthday Milestone',
  'College Fest',
  'Product Launch',
  'Hackathon',
  'Charity Gala',
  'Cultural Festival',
  'Destination Retreat',
] as const;

export const VENUE_PREFERENCES = [
  'Indoor Luxury Venue',
  'Outdoor Garden / Courtyard',
  'Modern Convention Center',
  'Rooftop / Urban Loft',
  'Beachfront / Resort',
  'Hybrid / Multi-Stage Space',
] as const;

export const PRIORITY_OPTIONS = [
  'Gourmet Catering & Bar',
  'Immersive Decor & Lighting',
  'Keynote Stage & AV Production',
  'Photography & Cinema',
  'Guest Hospitality & Swag',
  'Live Entertainment & Music',
  'Strict Cost Control',
  'Sustainability & Zero-Waste',
] as const;

export interface WizardFormState {
  title: string;
  type: string;
  date: string;
  location: string;
  venuePreference: string;
  guestCount: number;
  totalBudget: number;
  contingencyPercent: number;
  priorities: string[];
  notes: string;
}

export interface WizardPreset {
  label: string;
  badge: string;
  title: string;
  type: string;
  date: string;
  location: string;
  venuePreference: string;
  guestCount: number;
  totalBudget: number;
  contingencyPercent: number;
  priorities: string[];
  notes: string;
}

export const WIZARD_PRESETS: WizardPreset[] = [
  {
    label: 'Luxury Garden Wedding',
    badge: '160 Guests · $75k',
    title: 'Aria & Julian Botanical Estate Wedding',
    type: 'Wedding',
    date: '2026-09-19',
    location: 'Napa Valley, CA',
    venuePreference: 'Outdoor Garden / Courtyard',
    guestCount: 160,
    totalBudget: 75000,
    contingencyPercent: 12,
    priorities: [
      'Gourmet Catering & Bar',
      'Immersive Decor & Lighting',
      'Photography & Cinema',
    ],
    notes:
      'Candlelit conservatory dinner, seasonal farm-to-table tasting menu, live string quartet during cocktail hour, and late-night espresso bar.',
  },
  {
    label: 'AI Developer Hackathon',
    badge: '350 Guests · $52k',
    title: 'Nexus Global AI Builders Hackathon',
    type: 'Hackathon',
    date: '2026-10-10',
    location: 'San Francisco, CA',
    venuePreference: 'Modern Convention Center',
    guestCount: 350,
    totalBudget: 52000,
    contingencyPercent: 10,
    priorities: [
      'Keynote Stage & AV Production',
      'Gourmet Catering & Bar',
      'Guest Hospitality & Swag',
    ],
    notes:
      '36-hour continuous venue access, redundant dual-ISP Wi-Fi, 5 meal services + midnight fuel bar, LED mainstage for finals.',
  },
  {
    label: 'Executive Product Launch',
    badge: '220 Guests · $90k',
    title: 'Horizon Spatial Compute Keynote & Gala',
    type: 'Product Launch',
    date: '2026-11-12',
    location: 'New York, NY',
    venuePreference: 'Rooftop / Urban Loft',
    guestCount: 220,
    totalBudget: 90000,
    contingencyPercent: 10,
    priorities: [
      'Keynote Stage & AV Production',
      'Immersive Decor & Lighting',
      'Photography & Cinema',
    ],
    notes:
      'Press and analyst keynote followed by interactive hardware demo pods, spatial projection mapping, and craft cocktail reception.',
  },
  {
    label: 'Campus Cultural Festival',
    badge: '800 Guests · $40k',
    title: 'Aurora Annual University Arts & Music Fest',
    type: 'College Fest',
    date: '2026-08-28',
    location: 'Austin, TX',
    venuePreference: 'Hybrid / Multi-Stage Space',
    guestCount: 800,
    totalBudget: 40000,
    contingencyPercent: 15,
    priorities: [
      'Live Entertainment & Music',
      'Keynote Stage & AV Production',
      'Strict Cost Control',
    ],
    notes:
      'Main outdoor concert stage, student food truck village, sponsor activation booths, and campus security perimeter.',
  },
];

/**
 * Maps the JSON payload returned by `/api/ai/generate-plan` into a complete `PlanoraEvent`.
 * @param form Current wizard form inputs.
 * @param data Parsed response data from `/api/ai/generate-plan`.
 * @returns Normalized `PlanoraEvent` ready to save and inspect.
 */
export function buildPlanoraEventFromApiResponse(
  form: WizardFormState,
  data: Record<string, unknown>
): PlanoraEvent {
  const nowId = `evt_${Date.now()}`;
  const rawBudget = Array.isArray(data.budgetItems) ? data.budgetItems : [];
  const rawTasks = Array.isArray(data.tasks) ? data.tasks : [];
  const rawVendors = Array.isArray(data.vendors) ? data.vendors : [];
  const rawIdeas = Array.isArray(data.ideas) ? data.ideas : [];

  const budgetItems: BudgetItem[] = rawBudget.map(
    (item: Record<string, unknown>, idx: number) => ({
      id: `b_${nowId}_${idx}`,
      category: String(item.category || 'General'),
      title: String(item.title || 'Allocated Expense'),
      plannedAmount: Number(item.plannedAmount) || 0,
      quotedAmount: Number(item.quotedAmount) || 0,
      actualAmount: Number(item.actualAmount) || 0,
      lowEstimate:
        Number(item.lowEstimate) ||
        Math.round((Number(item.plannedAmount) || 0) * 0.85),
      highEstimate:
        Number(item.highEstimate) ||
        Math.round((Number(item.plannedAmount) || 0) * 1.15),
      paymentStatus:
        item.paymentStatus === 'Paid' ||
        item.paymentStatus === 'Partial' ||
        item.paymentStatus === 'Unpaid'
          ? item.paymentStatus
          : 'Unpaid',
      notes: String(item.notes || ''),
    })
  );

  const baseTasks: TimelineTask[] = rawTasks.map(
    (t: Record<string, unknown>, idx: number) => ({
      id: `t_${nowId}_${idx}`,
      title: String(t.title || 'Milestone Task'),
      description: String(t.description || ''),
      dueDate: String(t.dueDate || form.date),
      durationDays: Math.max(
        1,
        Math.min(90, Math.round(Number(t.durationDays) || 5))
      ),
      priority:
        t.priority === 'High' || t.priority === 'Medium' || t.priority === 'Low'
          ? t.priority
          : 'Medium',
      category: String(t.category || 'Operations'),
      status:
        t.status === 'Done' ||
        t.status === 'In Progress' ||
        t.status === 'Todo'
          ? t.status
          : 'Todo',
      assignee: String(t.assignee || 'Lead Planner'),
    })
  );

  const tasks = inferLogicalDependencies(baseTasks);

  const vendors: VendorItem[] = rawVendors.map(
    (v: Record<string, unknown>, idx: number) => ({
      id: `v_${nowId}_${idx}`,
      category: String(v.category || 'General'),
      vendorName: String(v.vendorName || 'Recommended Partner'),
      contactInfo: String(v.contactInfo || 'inquiries@vendor.example.com'),
      estimatedPrice: Number(v.estimatedPrice) || 0,
      quotedAmount: Number(v.quotedAmount) || 0,
      bookingStatus:
        v.bookingStatus === 'Booked' ||
        v.bookingStatus === 'Negotiating' ||
        v.bookingStatus === 'Contacted' ||
        v.bookingStatus === 'Shortlisted' ||
        v.bookingStatus === 'Declined'
          ? v.bookingStatus
          : 'Shortlisted',
      followUpDate: String(v.followUpDate || form.date),
      notes: String(v.notes || ''),
    })
  );

  const ideas: CreativeIdea[] = rawIdeas.map(
    (idea: Record<string, unknown>, idx: number) => ({
      id: `i_${nowId}_${idx}`,
      category: String(idea.category || 'Experience'),
      title: String(idea.title || 'Creative Enhancement'),
      description: String(idea.description || ''),
      estimatedCostImpact: String(
        idea.estimatedCostImpact || 'Included in budget'
      ),
      executionTip: String(idea.executionTip || ''),
    })
  );

  return {
    id: nowId,
    title: form.title.trim(),
    type: form.type,
    date: form.date,
    location: form.location.trim() || 'Flexible Location',
    venuePreference: form.venuePreference,
    guestCount: Math.max(10, Number(form.guestCount) || 100),
    totalBudget: Math.max(500, Number(form.totalBudget) || 25000),
    contingencyPercent: Math.max(
      0,
      Math.min(35, Number(form.contingencyPercent) || 10)
    ),
    notes: form.notes.trim(),
    priorities: form.priorities,
    aiConceptSummary: String(
      data.aiConceptSummary ||
        `Tailored ${form.type} blueprint for ${form.guestCount} guests in ${form.location}.`
    ),
    aiRisksAndContingencies: String(
      data.aiRisksAndContingencies ||
        `Maintain a ${form.contingencyPercent}% contingency reserve and lock primary venue & catering contracts early.`
    ),
    budgetItems,
    tasks,
    vendors,
    ideas,
    savedScenarios: [],
    updatedAt: new Date().toISOString().split('T')[0],
  };
}
