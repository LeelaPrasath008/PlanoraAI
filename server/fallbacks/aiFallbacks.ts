import {
  GeneratePlanPayload,
  ServerBudgetItemInput,
  ServerEventInput,
} from '../../shared/types';
import { clampNumber, sanitizeText } from '../config';

/**
 * Generates a deterministic, mathematically reconciled event plan fallback
 * when `GEMINI_API_KEY` is unconfigured or the upstream model is unreachable.
 */
export function buildDeterministicFallbackPlan(payload: GeneratePlanPayload) {
  const totalBudget = clampNumber(
    payload.totalBudget,
    100,
    1_000_000_000,
    100000
  );
  const guestCount = clampNumber(payload.guestCount, 1, 100000, 100);
  const contingencyPct = clampNumber(payload.contingencyPercent, 0, 50, 8);
  const usableBudget = Math.round(totalBudget * (1 - contingencyPct / 100));
  const eventDate = sanitizeText(
    payload.eventDate ?? payload.date,
    32,
    '2027-03-15'
  );
  const eventType = sanitizeText(
    payload.eventType ?? payload.type,
    60,
    'Event'
  );
  const city = sanitizeText(
    payload.city ?? payload.location,
    120,
    'your city'
  );
  const themeStyle = sanitizeText(
    payload.themeStyle,
    240,
    'Warm Contemporary Elegance'
  );
  const venuePreference = sanitizeText(payload.venuePreference, 32, 'Hybrid');
  const foodPreference = sanitizeText(
    payload.foodPreference,
    240,
    'Curated Multi-Course Menu'
  );
  const rawPriorities = Array.isArray(payload.priorities)
    ? payload.priorities.join(', ')
    : payload.priorities;
  const priorities = sanitizeText(
    rawPriorities,
    240,
    'Guest Experience and Affordability'
  );
  const mustHaves = sanitizeText(payload.mustHaves, 240, 'core elements');
  const avoidItems = sanitizeText(payload.avoidItems, 240, 'unwanted items');

  const b1 = Math.round(usableBudget * 0.26);
  const b2 = Math.round(usableBudget * 0.38);
  const b3 = Math.round(usableBudget * 0.14);
  const b4 = Math.round(usableBudget * 0.1);
  const b5 = Math.round(usableBudget * 0.07);
  const b6 = Math.max(0, usableBudget - (b1 + b2 + b3 + b4 + b5));

  return {
    isDeterministicFallback: true,
    usedFallback: true,
    fallbackCode: 'ai_unavailable',
    aiConceptSummary: `[Deterministic Demo Fallback — Configure GEMINI_API_KEY for Live AI] A structured ${eventType} blueprint for ${guestCount} guests in ${city} designed around "${themeStyle}". Preserves ${contingencyPct}% contingency reserve while prioritizing ${priorities}.`,
    aiRisksAndContingencies: `1. Weather & Venue Backup (${venuePreference}): Confirm covered backup area 14 days prior. 2. Overlooked Costs: Account for generator backup, service taxes, and local sound permits within the ${contingencyPct}% contingency reserve.`,
    budgetItems: [
      {
        category: 'Venue',
        title: `${venuePreference} Venue Booking & Basic Seating`,
        plannedAmount: b1,
        quotedAmount: Math.round(usableBudget * 0.25),
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.22),
        highEstimate: Math.round(usableBudget * 0.3),
        paymentStatus: 'Unpaid',
        notes: 'Illustrative allocation (26% of usable budget).',
      },
      {
        category: 'Catering',
        title: `${foodPreference} (${guestCount} Guests)`,
        plannedAmount: b2,
        quotedAmount: b2,
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.34),
        highEstimate: Math.round(usableBudget * 0.44),
        paymentStatus: 'Unpaid',
        notes: 'Illustrative allocation (38% of usable budget).',
      },
      {
        category: 'Decoration',
        title: `Theme Decor: ${themeStyle}`,
        plannedAmount: b3,
        quotedAmount: b3,
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.11),
        highEstimate: Math.round(usableBudget * 0.17),
        paymentStatus: 'Unpaid',
        notes: 'Focuses on high-visibility entrance and dining focal points.',
      },
      {
        category: 'Photography',
        title: 'Documentary Photo & Highlight Reel Coverage',
        plannedAmount: b4,
        quotedAmount: b4,
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.08),
        highEstimate: Math.round(usableBudget * 0.12),
        paymentStatus: 'Unpaid',
        notes: 'Full event duration coverage.',
      },
      {
        category: 'Entertainment',
        title: 'Sound System, Microphones & Live/Curated Music',
        plannedAmount: b5,
        quotedAmount: b5,
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.05),
        highEstimate: Math.round(usableBudget * 0.09),
        paymentStatus: 'Unpaid',
        notes: 'Includes acoustic check 2 hours prior.',
      },
      {
        category: 'Invitations',
        title: 'Digital RSVP Suite & Printed Keepsake Itinerary Cards',
        plannedAmount: b6,
        quotedAmount: b6,
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.03),
        highEstimate: Math.round(usableBudget * 0.06),
        paymentStatus: 'Unpaid',
        notes: 'Includes QR location pin and dietary tracker.',
      },
    ],
    tasks: [
      {
        title: 'Shortlist & Lock Primary Venue Contract',
        description:
          'Verify capacity, load-in hours, power backup, and cancellation terms.',
        dueDate: eventDate,
        durationDays: 10,
        priority: 'High',
        category: 'Venue',
        status: 'Todo',
        assignee: 'Lead Organizer',
      },
      {
        title: 'Finalize Catering Menu & Dietary Matrix',
        description: `Confirm menu aligned with: ${foodPreference}.`,
        dueDate: eventDate,
        durationDays: 7,
        priority: 'High',
        category: 'Catering',
        status: 'Todo',
        assignee: 'Culinary Lead',
      },
      {
        title: 'Approve Decor Layout & Lighting Plan',
        description: `Incorporate must-haves (${mustHaves}) and avoid ${avoidItems}.`,
        dueDate: eventDate,
        durationDays: 6,
        priority: 'Medium',
        category: 'Decoration',
        status: 'Todo',
        assignee: 'Decor Coordinator',
      },
      {
        title: 'Confirm Photography Shot List & Timeline',
        description: 'Share key ceremony and keynote moments with photo team.',
        dueDate: eventDate,
        durationDays: 5,
        priority: 'Medium',
        category: 'Photography',
        status: 'Todo',
        assignee: 'Creative Lead',
      },
      {
        title: 'Dispatch Digital Invitations & Track RSVPs',
        description: 'Collect guest attendance and dietary preferences.',
        dueDate: eventDate,
        durationDays: 14,
        priority: 'High',
        category: 'Invitations',
        status: 'Todo',
        assignee: 'Guest Relations',
      },
      {
        title: 'Conduct Final Sound, AV & Run-of-Show Rehearsal',
        description: 'Test microphones, stage lighting, and backup power.',
        dueDate: eventDate,
        durationDays: 2,
        priority: 'High',
        category: 'Operations',
        status: 'Todo',
        assignee: 'Production Manager',
      },
    ],
    vendors: [
      {
        category: 'Venue',
        vendorName: `Suggested Archetype: ${venuePreference} Venue in ${city}`,
        contactInfo: 'Unverified Suggestion — Compare 3 local venue quotes',
        estimatedPrice: b1,
        quotedAmount: 0,
        bookingStatus: 'Shortlisted',
        followUpDate: eventDate,
        notes:
          'Ask about generator backup, parking capacity, and corkage/decorator policies.',
        isAiSuggestion: true,
      },
      {
        category: 'Catering',
        vendorName: 'Suggested Archetype: Regional Full-Service Caterer',
        contactInfo: 'Unverified Suggestion — Schedule tasting before deposit',
        estimatedPrice: b2,
        quotedAmount: 0,
        bookingStatus: 'Shortlisted',
        followUpDate: eventDate,
        notes:
          'Request per-plate breakdown and staff-to-guest ratio (1 server per 20 guests).',
        isAiSuggestion: true,
      },
      {
        category: 'Decoration',
        vendorName: 'Suggested Archetype: Event Styling & Floral Studio',
        contactInfo: 'Unverified Suggestion — Request moodboard & mock table',
        estimatedPrice: b3,
        quotedAmount: 0,
        bookingStatus: 'Shortlisted',
        followUpDate: eventDate,
        notes: 'Confirm reusable structures and teardown window.',
        isAiSuggestion: true,
      },
      {
        category: 'Photography',
        vendorName: 'Suggested Archetype: Documentary Photo & Cinema Team',
        contactInfo: 'Unverified Suggestion — Review full event galleries',
        estimatedPrice: b4,
        quotedAmount: 0,
        bookingStatus: 'Shortlisted',
        followUpDate: eventDate,
        notes: 'Verify dual-card camera backup and delivery turnaround.',
        isAiSuggestion: true,
      },
    ],
    ideas: [
      {
        category: 'Decor',
        title: 'Locally Sourced Seasonal Botanical Focal Arch',
        description:
          'Use regional seasonal blooms and reusable fabric drapery to create a warm welcome frame without floral foam waste.',
        estimatedCostImpact: 'Within planned Decor budget',
        executionTip:
          'Source flowers from the morning wholesale market 24 hours prior.',
      },
      {
        category: 'Food & Beverage',
        title: 'Interactive Regional Welcome Beverage Bar',
        description:
          'Greet arriving guests with a signature seasonal cooler or spiced chai station to eliminate first-hour congestion.',
        estimatedCostImpact: 'Cost-neutral swap within Catering',
        executionTip:
          'Place 15 feet past the entrance so guests do not block the doorway.',
      },
      {
        category: 'Guest Experience',
        title: 'QR Digital Keepsake & Live Photo Wall',
        description:
          'Let guests scan table cards to view the schedule and upload candid moments to a moderated live gallery.',
        estimatedCostImpact: 'Low cost / included in AV',
        executionTip: 'Print QR codes on matte cardstock at each table.',
      },
      {
        category: 'Lighting',
        title: 'Warm Perimeter Uplighting & Statement Entry Glow',
        description:
          'Focus lighting budget on the arrival pathway and main stage backdrop for maximum visual impact.',
        estimatedCostImpact: 'Saves 15% vs full ceiling rig',
        executionTip: 'Use warm 2700K LED fixtures on dimmers.',
      },
    ],
  };
}

/**
 * Generates deterministic line-item budget optimization adjustments when AI is unavailable.
 */
export function buildDeterministicFallbackOptimization(
  event: ServerEventInput | undefined,
  targetReductionPercent: number
) {
  const items = (event?.budgetItems || []).map(
    (item: ServerBudgetItemInput) => {
      const cat = sanitizeText(item.category, 80, 'General');
      const isProtected =
        cat.toLowerCase().includes('catering') ||
        cat.toLowerCase().includes('food');
      const factor = isProtected ? 0.96 : 1 - targetReductionPercent / 100;
      const planned = clampNumber(item.plannedAmount, 0, 1_000_000_000, 0);
      return {
        id: sanitizeText(item.id, 128, ''),
        category: cat,
        title: sanitizeText(item.title, 160, 'Expense'),
        currentPlanned: planned,
        recommendedPlanned: Math.round(planned * factor),
        rationale: isProtected
          ? 'Protected core hospitality priority (minimal 4% trim via seasonal menu swap).'
          : `Reduced by ${targetReductionPercent}% using off-peak package & local sourcing.`,
      };
    }
  );
  return {
    isDeterministicFallback: true,
    usedFallback: true,
    fallbackCode: 'ai_unavailable',
    strategySummary:
      '[Deterministic Optimization Preview] Preserves guest culinary experience while trimming non-essential decor and rental overhead.',
    adjustments: items,
  };
}

/**
 * Generates a deterministic Copilot response and actionable proposal when AI is unavailable.
 */
export function buildDeterministicFallbackCopilot(
  event: ServerEventInput | undefined
) {
  return {
    isDeterministicFallback: true,
    usedFallback: true,
    fallbackCode: 'ai_unavailable',
    reply: `[Demo Copilot Mode] Based on "${sanitizeText(
      event?.title,
      120,
      'your event'
    )}" (${clampNumber(
      event?.guestCount,
      1,
      100000,
      100
    )} guests, budget ${sanitizeText(event?.currency, 8, 'INR')} ${clampNumber(
      event?.totalBudget,
      0,
      1_000_000_000,
      100000
    )}), I recommend reviewing your top 3 cost centers and locking high-priority tasks due in the next 14 days. You can preview and confirm the proposed adjustment below.`,
    proposedChanges: [
      {
        type: 'add_task' as const,
        summaryLabel:
          'Add Task: Confirm Final Vendor Payment & Delivery Schedule',
        payload: {
          title: 'Confirm Final Vendor Payment & Delivery Schedule',
          description:
            'Verify arrival times and balance invoices for all booked vendors.',
          dueDate: sanitizeText(
            event?.eventDate ?? event?.date,
            32,
            '2027-02-01'
          ),
          priority: 'High' as const,
          category: 'Operations',
        },
      },
    ],
  };
}

/**
 * Generates a deterministic trade-off analysis for the Scenario Simulator when AI is unavailable.
 */
export function buildDeterministicFallbackScenario(
  currentPlan: Record<string, unknown>,
  simulatedScenario: Record<string, unknown>
) {
  return {
    isDeterministicFallback: true,
    usedFallback: true,
    fallbackCode: 'ai_unavailable',
    tradeOffAnalysis: `[Deterministic Trade-Off Summary] Shifting from ${clampNumber(
      currentPlan.guestCount,
      1,
      100000,
      100
    )} to ${clampNumber(
      simulatedScenario.guestCount,
      1,
      100000,
      100
    )} guests with a ${sanitizeText(
      simulatedScenario.cateringTier,
      60,
      'Signature'
    )} catering tier and ${sanitizeText(
      simulatedScenario.venuePreference,
      32,
      'Hybrid'
    )} venue changes variable hospitality costs while fixed production costs (photography, entertainment) remain stable.`,
    recommendations: [
      'Lock catering per-plate slabs for the new guest count tier before paying the venue deposit.',
      'Adjust contingency reserve if switching from Indoor to Outdoor to cover weather backup.',
    ],
  };
}
