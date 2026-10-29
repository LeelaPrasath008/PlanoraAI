import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isGeminiConfigured = Boolean(
  process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY.trim().length > 5
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'unconfigured',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = 'gemini-3.8-flash';

function buildDeterministicFallbackPlan(payload: any) {
  const totalBudget = Number(payload.totalBudget) || 100000;
  const guestCount = Number(payload.guestCount) || 100;
  const contingencyPct = Number(payload.contingencyPercent) || 8;
  const usableBudget = Math.round(totalBudget * (1 - contingencyPct / 100));
  const eventDate = payload.eventDate || '2027-03-15';

  return {
    isDeterministicFallback: true,
    aiConceptSummary: `[Deterministic Demo Fallback — Configure GEMINI_API_KEY for Live AI] A structured ${payload.eventType || 'Event'} blueprint for ${guestCount} guests in ${payload.city || 'your city'} designed around "${payload.themeStyle || 'Warm Contemporary Elegance'}". Preserves ${contingencyPct}% contingency reserve while prioritizing ${payload.priorities || 'Guest Experience and Affordability'}.`,
    aiRisksAndContingencies: `1. Weather & Venue Backup (${payload.venuePreference || 'Hybrid'}): Confirm covered backup area 14 days prior. 2. Overlooked Costs: Account for generator backup, service taxes, and local sound permits within the ${contingencyPct}% contingency reserve.`,
    budgetItems: [
      {
        category: 'Venue',
        title: `${payload.venuePreference || 'Hybrid'} Venue Booking & Basic Seating`,
        plannedAmount: Math.round(usableBudget * 0.26),
        quotedAmount: Math.round(usableBudget * 0.25),
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.22),
        highEstimate: Math.round(usableBudget * 0.3),
        paymentStatus: 'Unpaid',
        notes: 'Illustrative allocation (26% of usable budget).',
      },
      {
        category: 'Catering',
        title: `${payload.foodPreference || 'Curated Multi-Course Menu'} (${guestCount} Guests)`,
        plannedAmount: Math.round(usableBudget * 0.38),
        quotedAmount: Math.round(usableBudget * 0.38),
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.34),
        highEstimate: Math.round(usableBudget * 0.44),
        paymentStatus: 'Unpaid',
        notes: 'Illustrative allocation (38% of usable budget).',
      },
      {
        category: 'Decoration',
        title: `Theme Decor: ${payload.themeStyle || 'Seasonal Florals & Ambient Lighting'}`,
        plannedAmount: Math.round(usableBudget * 0.14),
        quotedAmount: Math.round(usableBudget * 0.14),
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.11),
        highEstimate: Math.round(usableBudget * 0.17),
        paymentStatus: 'Unpaid',
        notes: 'Focuses on high-visibility entrance and dining focal points.',
      },
      {
        category: 'Photography',
        title: 'Documentary Photo & Highlight Reel Coverage',
        plannedAmount: Math.round(usableBudget * 0.1),
        quotedAmount: Math.round(usableBudget * 0.1),
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.08),
        highEstimate: Math.round(usableBudget * 0.12),
        paymentStatus: 'Unpaid',
        notes: 'Full event duration coverage.',
      },
      {
        category: 'Entertainment',
        title: 'Sound System, Microphones & Live/Curated Music',
        plannedAmount: Math.round(usableBudget * 0.07),
        quotedAmount: Math.round(usableBudget * 0.07),
        actualAmount: 0,
        lowEstimate: Math.round(usableBudget * 0.05),
        highEstimate: Math.round(usableBudget * 0.09),
        paymentStatus: 'Unpaid',
        notes: 'Includes acoustic check 2 hours prior.',
      },
      {
        category: 'Invitations',
        title: 'Digital RSVP Suite & Printed Keepsake Itinerary Cards',
        plannedAmount: Math.round(usableBudget * 0.05),
        quotedAmount: Math.round(usableBudget * 0.05),
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
        description: 'Verify capacity, load-in hours, power backup, and cancellation terms.',
        dueDate: eventDate,
        priority: 'High',
        category: 'Venue',
        status: 'Todo',
        assignee: 'Lead Organizer',
      },
      {
        title: 'Finalize Catering Menu & Dietary Matrix',
        description: `Confirm menu aligned with: ${payload.foodPreference || 'guest preferences'}.`,
        dueDate: eventDate,
        priority: 'High',
        category: 'Catering',
        status: 'Todo',
        assignee: 'Culinary Lead',
      },
      {
        title: 'Approve Decor Layout & Lighting Plan',
        description: `Incorporate must-haves (${payload.mustHaves || 'core elements'}) and avoid ${payload.avoidItems || 'unwanted items'}.`,
        dueDate: eventDate,
        priority: 'Medium',
        category: 'Decoration',
        status: 'Todo',
        assignee: 'Decor Coordinator',
      },
    ],
    vendors: [
      {
        category: 'Venue',
        vendorName: `Suggested Archetype: ${payload.venuePreference || 'Hybrid'} Venue in ${payload.city || 'City'}`,
        contactInfo: 'Unverified Suggestion — Compare 3 local venue quotes',
        estimatedPrice: Math.round(usableBudget * 0.26),
        quotedAmount: 0,
        bookingStatus: 'Shortlisted',
        followUpDate: eventDate,
        notes: 'Ask about generator backup, parking capacity, and corkage/decorator policies.',
        isAiSuggestion: true,
      },
      {
        category: 'Catering',
        vendorName: 'Suggested Archetype: Regional Full-Service Caterer',
        contactInfo: 'Unverified Suggestion — Schedule tasting before deposit',
        estimatedPrice: Math.round(usableBudget * 0.38),
        quotedAmount: 0,
        bookingStatus: 'Shortlisted',
        followUpDate: eventDate,
        notes: 'Request per-plate breakdown and staff-to-guest ratio (1 server per 20 guests).',
        isAiSuggestion: true,
      },
    ],
    ideas: [
      {
        category: 'Decor',
        title: 'Locally Sourced Seasonal Botanical Focal Arch',
        description: 'Use regional seasonal blooms and reusable fabric drapery to create a warm welcome frame without floral foam waste.',
        estimatedCostImpact: 'Within planned Decor budget',
        executionTip: 'Source flowers from the morning wholesale market 24 hours prior.',
      },
      {
        category: 'Food & Beverage',
        title: 'Interactive Regional Welcome Beverage Bar',
        description: 'Greet arriving guests with a signature seasonal cooler or spiced chai station to eliminate first-hour congestion.',
        estimatedCostImpact: 'Cost-neutral swap within Catering',
        executionTip: 'Place 15 feet past the entrance so guests do not block the doorway.',
      },
    ],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/ai/status', (_req, res) => {
    res.json({ configured: isGeminiConfigured });
  });

  // 1. Full AI Event Plan Engine (Wizard Step 5)
  app.post('/api/ai/generate-plan', async (req, res) => {
    const payload = req.body || {};

    if (!isGeminiConfigured) {
      return res.json(buildDeterministicFallbackPlan(payload));
    }

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const totalBudget = Number(payload.totalBudget) || 100000;
      const contingencyPct = Number(payload.contingencyPercent) || 8;
      const usableBudget = Math.round(totalBudget * (1 - contingencyPct / 100));

      const prompt = `Generate a complete, realistic, culturally and regionally grounded event plan for Planora AI:
- Event Type: ${payload.eventType}
- Title: ${payload.title}
- Description: ${payload.description || 'N/A'}
- Event Date: ${payload.eventDate} (Current Date: ${todayStr} — if the event date is within 14 days, prioritize urgent immediate tasks!)
- Duration: ${payload.durationHours || 6} hours
- City / Location: ${payload.city}
- Guest Count: ${payload.guestCount}
- Total Budget: ${payload.currency} ${totalBudget} (Contingency Reserve: ${contingencyPct}%, so allocate approximately ${payload.currency} ${usableBudget} across categories)
- Preferred Theme & Style: ${payload.themeStyle}
- Venue Preference: ${payload.venuePreference}
- Food & Dietary Preferences: ${payload.foodPreference}
- Cultural / Regional Preferences: ${payload.culturalNotes || 'None specified'}
- Must-Have Elements: ${payload.mustHaves || 'None'}
- Items to Avoid: ${payload.avoidItems || 'None'}
- Stated Priorities: ${payload.priorities}

CRITICAL RULES:
1. Never invent fake real-world business phone numbers or claim a specific real-world vendor is confirmed. Prefix AI-suggested vendor entries with "Suggested Archetype:" and provide concrete selection criteria and questions to ask in "notes".
2. Ensure the sum of "plannedAmount" across all budgetItems is close to ${usableBudget} (${totalBudget} minus ${contingencyPct}% contingency). Set "actualAmount" to 0 and "paymentStatus" to "Unpaid" for a fresh plan.
3. Provide 6-7 budgetItems, 6-7 tasks with realistic YYYY-MM-DD dueDates between ${todayStr} and ${payload.eventDate}, 5-6 vendor archetypes, and 5 creative ideas across Decor, Food & Beverage, Entertainment, Invitations, and Activities.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are Planora AI, a senior event architect and financial planner. Return structured, realistic, culturally sensitive JSON plans.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiConceptSummary: {
                type: Type.STRING,
                description: 'Personalized event concept, theme narrative, and budget strategy (2-4 sentences).',
              },
              aiRisksAndContingencies: {
                type: Type.STRING,
                description: '3 concrete potential risks, overlooked costs, and contingency recommendations.',
              },
              budgetItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    title: { type: Type.STRING },
                    plannedAmount: { type: Type.NUMBER },
                    quotedAmount: { type: Type.NUMBER },
                    actualAmount: { type: Type.NUMBER },
                    lowEstimate: { type: Type.NUMBER },
                    highEstimate: { type: Type.NUMBER },
                    paymentStatus: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: [
                    'category',
                    'title',
                    'plannedAmount',
                    'quotedAmount',
                    'actualAmount',
                    'lowEstimate',
                    'highEstimate',
                    'paymentStatus',
                    'notes',
                  ],
                },
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    dueDate: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    category: { type: Type.STRING },
                    status: { type: Type.STRING },
                    assignee: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'description',
                    'dueDate',
                    'priority',
                    'category',
                    'status',
                    'assignee',
                  ],
                },
              },
              vendors: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    vendorName: { type: Type.STRING },
                    contactInfo: { type: Type.STRING },
                    estimatedPrice: { type: Type.NUMBER },
                    quotedAmount: { type: Type.NUMBER },
                    bookingStatus: { type: Type.STRING },
                    followUpDate: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: [
                    'category',
                    'vendorName',
                    'contactInfo',
                    'estimatedPrice',
                    'quotedAmount',
                    'bookingStatus',
                    'followUpDate',
                    'notes',
                  ],
                },
              },
              ideas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    estimatedCostImpact: { type: Type.STRING },
                    executionTip: { type: Type.STRING },
                  },
                  required: [
                    'category',
                    'title',
                    'description',
                    'estimatedCostImpact',
                    'executionTip',
                  ],
                },
              },
            },
            required: [
              'aiConceptSummary',
              'aiRisksAndContingencies',
              'budgetItems',
              'tasks',
              'vendors',
              'ideas',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        ...parsed,
        isDeterministicFallback: false,
      });
    } catch (error: any) {
      console.error('Error in /api/ai/generate-plan:', error);
      // Graceful fallback clearly labeled as demo fallback
      res.json({
        ...buildDeterministicFallbackPlan(payload),
        fallbackReason:
          error?.message || 'Gemini API temporarily unavailable; using labeled deterministic plan.',
      });
    }
  });

  // 2. Optimize My Budget AI Action
  app.post('/api/ai/optimize-budget', async (req, res) => {
    const { event, targetReductionPercent = 12 } = req.body || {};

    if (!isGeminiConfigured) {
      const items = (event?.budgetItems || []).map((item: any) => {
        const isProtected =
          item.category.toLowerCase().includes('catering') ||
          item.category.toLowerCase().includes('food');
        const factor = isProtected ? 0.96 : 1 - targetReductionPercent / 100;
        return {
          id: item.id,
          category: item.category,
          title: item.title,
          currentPlanned: item.plannedAmount,
          recommendedPlanned: Math.round(item.plannedAmount * factor),
          rationale: isProtected
            ? 'Protected core hospitality priority (minimal 4% trim via seasonal menu swap).'
            : `Reduced by ${targetReductionPercent}% using off-peak package & local sourcing.`,
        };
      });
      return res.json({
        isDeterministicFallback: true,
        strategySummary:
          '[Deterministic Optimization Preview] Preserves guest culinary experience while trimming non-essential decor and rental overhead.',
        adjustments: items,
      });
    }

    try {
      const prompt = `Optimize the budget for this event while strictly respecting the user's stated priorities:
- Event: ${event?.title} (${event?.eventType}, ${event?.guestCount} guests, ${event?.city})
- Total Budget Cap: ${event?.currency} ${event?.totalBudget} (Contingency: ${event?.contingencyPercent}%)
- User Priorities: ${event?.priorities}
- Must-Haves: ${event?.mustHaves}
- Current Budget Items: ${JSON.stringify(
        (event?.budgetItems || []).map((b: any) => ({
          id: b.id,
          category: b.category,
          title: b.title,
          plannedAmount: b.plannedAmount,
        }))
      )}

Propose a realistic optimization that brings total planned spending comfortably within the usable budget (or saves ~${targetReductionPercent}%) while protecting the user's top priorities. Return the exact item "id" for each adjustment.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a financial event strategist. Propose practical, line-by-line budget optimizations.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategySummary: { type: Type.STRING },
              adjustments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    title: { type: Type.STRING },
                    currentPlanned: { type: Type.NUMBER },
                    recommendedPlanned: { type: Type.NUMBER },
                    rationale: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'category',
                    'title',
                    'currentPlanned',
                    'recommendedPlanned',
                    'rationale',
                  ],
                },
              },
            },
            required: ['strategySummary', 'adjustments'],
          },
        },
      });

      res.json({
        ...JSON.parse(response.text || '{}'),
        isDeterministicFallback: false,
      });
    } catch (error: any) {
      console.error('Error in /api/ai/optimize-budget:', error);
      res.status(500).json({
        error: error?.message || 'Failed to optimize budget with AI.',
      });
    }
  });

  // 3. AI Planning Copilot (with explicit user confirmation for state changes)
  app.post('/api/ai/copilot', async (req, res) => {
    const { event, userMessage } = req.body || {};

    if (!isGeminiConfigured) {
      return res.json({
        isDeterministicFallback: true,
        reply: `[Demo Copilot Mode] Based on "${event?.title}" (${event?.guestCount} guests, budget ${event?.currency} ${event?.totalBudget}), I recommend reviewing your top 3 cost centers and locking high-priority tasks due in the next 14 days. You can preview and confirm the proposed adjustment below.`,
        proposedChanges: [
          {
            type: 'add_task',
            summaryLabel: 'Add Task: Confirm Final Vendor Payment & Delivery Schedule',
            payload: {
              title: 'Confirm Final Vendor Payment & Delivery Schedule',
              description: 'Verify arrival times and balance invoices for all booked vendors.',
              dueDate: event?.eventDate || '2027-02-01',
              priority: 'High',
              category: 'Operations',
            },
          },
        ],
      });
    }

    try {
      const prompt = `Current Saved Event Context:
- Event: ${event?.title} (${event?.eventType})
- Date: ${event?.eventDate} | City: ${event?.city} | Venue: ${event?.venuePreference}
- Guests: ${event?.guestCount} | Total Budget: ${event?.currency} ${event?.totalBudget} (Contingency: ${event?.contingencyPercent}%)
- Priorities: ${event?.priorities} | Food: ${event?.foodPreference}
- Current Budget Items: ${JSON.stringify(
        (event?.budgetItems || []).map((b: any) => ({
          category: b.category,
          title: b.title,
          plannedAmount: b.plannedAmount,
          actualAmount: b.actualAmount,
        }))
      )}
- Current Tasks Count: ${(event?.tasks || []).length}
- Current Vendors: ${JSON.stringify(
        (event?.vendors || []).map((v: any) => ({
          category: v.category,
          vendorName: v.vendorName,
          estimatedPrice: v.estimatedPrice,
          quotedAmount: v.quotedAmount,
        }))
      )}

User Request: "${userMessage}"

Instructions:
1. Answer clearly, quantitatively, and practically using the saved event context.
2. Never claim a real-world vendor is confirmed or available.
3. Propose 1 to 3 concrete "proposedChanges" that the user can explicitly confirm to update their saved event data.
   Allowed "type" values for proposedChanges:
   - "update_budget_total" (payload: { newTotalBudget: number })
   - "update_guest_count" (payload: { newGuestCount: number, scaleCateringFactor: number })
   - "scale_budget_items" (payload: { scaleFactor: number, excludeCategory: string })
   - "add_budget_item" (payload: { category: string, title: string, plannedAmount: number, notes: string })
   - "add_task" (payload: { title: string, description: string, dueDate: string, priority: "High" | "Medium" | "Low", category: string })
   - "add_vendor" (payload: { category: string, vendorName: string, estimatedPrice: number, notes: string })
   - "add_idea" (payload: { category: "Decor" | "Food & Beverage" | "Entertainment" | "Invitations" | "Activities", title: string, description: string, estimatedCostImpact: string, executionTip: string })`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are Planora AI Copilot. Give structured, quantitative event planning advice and propose actionable updates that require explicit user confirmation.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              proposedChanges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    summaryLabel: { type: Type.STRING },
                    payload: {
                      type: Type.OBJECT,
                      properties: {
                        newTotalBudget: { type: Type.NUMBER },
                        newGuestCount: { type: Type.NUMBER },
                        scaleCateringFactor: { type: Type.NUMBER },
                        scaleFactor: { type: Type.NUMBER },
                        excludeCategory: { type: Type.STRING },
                        category: { type: Type.STRING },
                        title: { type: Type.STRING },
                        plannedAmount: { type: Type.NUMBER },
                        notes: { type: Type.STRING },
                        description: { type: Type.STRING },
                        dueDate: { type: Type.STRING },
                        priority: { type: Type.STRING },
                        vendorName: { type: Type.STRING },
                        estimatedPrice: { type: Type.NUMBER },
                        estimatedCostImpact: { type: Type.STRING },
                        executionTip: { type: Type.STRING },
                      },
                    },
                  },
                  required: ['type', 'summaryLabel', 'payload'],
                },
              },
            },
            required: ['reply', 'proposedChanges'],
          },
        },
      });

      res.json({
        ...JSON.parse(response.text || '{}'),
        isDeterministicFallback: false,
      });
    } catch (error: any) {
      console.error('Error in /api/ai/copilot:', error);
      res.status(500).json({
        error: error?.message || 'Failed to consult Planora AI Copilot.',
      });
    }
  });

  // 4. Scenario Simulator ("What If?" AI Trade-Off Explanation)
  app.post('/api/ai/simulate-scenario', async (req, res) => {
    const { currentPlan, simulatedScenario } = req.body || {};

    if (!isGeminiConfigured) {
      return res.json({
        isDeterministicFallback: true,
        tradeOffAnalysis: `[Deterministic Trade-Off Summary] Shifting from ${currentPlan?.guestCount} to ${simulatedScenario?.guestCount} guests with a ${simulatedScenario?.cateringTier} catering tier and ${simulatedScenario?.venuePreference} venue changes variable hospitality costs while fixed production costs (photography, entertainment) remain stable.`,
        recommendations: [
          'Lock catering per-plate slabs for the new guest count tier before paying the venue deposit.',
          'Adjust contingency reserve if switching from Indoor to Outdoor to cover weather backup.',
        ],
      });
    }

    try {
      const prompt = `Compare the Current Plan vs. the Proposed "What If?" Scenario and explain the practical trade-offs:
Current Plan:
- Guests: ${currentPlan?.guestCount} | Total Budget: ${currentPlan?.currency} ${currentPlan?.totalBudget}
- Date: ${currentPlan?.eventDate} | Venue Type: ${currentPlan?.venuePreference}
- Priorities: ${currentPlan?.priorities}

Proposed Scenario:
- Guests: ${simulatedScenario?.guestCount} | Total Budget: ${currentPlan?.currency} ${simulatedScenario?.totalBudget}
- Date: ${simulatedScenario?.eventDate} | Venue Type: ${simulatedScenario?.venuePreference}
- Catering Tier: ${simulatedScenario?.cateringTier} | Priority Focus: ${simulatedScenario?.priorityFocus}
- Calculated New Total Planned Spend: ${currentPlan?.currency} ${simulatedScenario?.projectedTotalSpend}
- Calculated Remaining Balance: ${currentPlan?.currency} ${simulatedScenario?.projectedRemaining}

Provide a clear 2-3 sentence trade-off analysis and 3 concrete recommendations.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are Planora AI Scenario Strategist. Explain financial, logistical, and guest-experience trade-offs concisely.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tradeOffAnalysis: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['tradeOffAnalysis', 'recommendations'],
          },
        },
      });

      res.json({
        ...JSON.parse(response.text || '{}'),
        isDeterministicFallback: false,
      });
    } catch (error: any) {
      console.error('Error in /api/ai/simulate-scenario:', error);
      res.status(500).json({
        error: error?.message || 'Failed to analyze scenario with AI.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Planora AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
