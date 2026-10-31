import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, GenerateContentConfig } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GeneratePlanPayload {
  eventType?: string;
  title?: string;
  description?: string;
  eventDate?: string;
  durationHours?: number;
  city?: string;
  guestCount?: number;
  totalBudget?: number;
  currency?: string;
  contingencyPercent?: number;
  venuePreference?: string;
  themeStyle?: string;
  foodPreference?: string;
  culturalNotes?: string;
  mustHaves?: string;
  avoidItems?: string;
  priorities?: string;
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
  eventType?: string;
  eventDate?: string;
  city?: string;
  venuePreference?: string;
  guestCount?: number;
  totalBudget?: number;
  currency?: string;
  contingencyPercent?: number;
  priorities?: string;
  mustHaves?: string;
  foodPreference?: string;
  budgetItems?: ServerBudgetItemInput[];
  tasks?: unknown[];
  vendors?: ServerVendorInput[];
}

export function sanitizeText(
  value: unknown,
  maxLength: number,
  fallback = ''
): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return (cleaned || fallback).slice(0, maxLength);
}

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function getResolvedApiKey(): string | undefined {
  const candidates = [process.env.API_KEY, process.env.GEMINI_API_KEY];
  for (const key of candidates) {
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 5) {
      return key.trim();
    }
  }
  return undefined;
}

export function checkGeminiConfigured(): boolean {
  return Boolean(getResolvedApiKey());
}

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: getResolvedApiKey() || 'unconfigured',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

// In-memory LRU response cache for high efficiency on repeated queries
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 64;
const aiResponseCache = new Map<string, { expiresAt: number; data: Record<string, unknown> }>();

function getCachedResponse(key: string): Record<string, unknown> | null {
  const entry = aiResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aiResponseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResponse(key: string, data: Record<string, unknown>): void {
  if (aiResponseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = aiResponseCache.keys().next().value;
    if (oldestKey) aiResponseCache.delete(oldestKey);
  }
  aiResponseCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data,
  });
}

// Sliding-window rate limiter per client IP
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 60;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    next();
    return;
  }

  if (bucket.count >= RATE_MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many requests. Please wait a moment before retrying.',
    });
    return;
  }

  bucket.count += 1;
  next();
}

function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

async function generateWithGemini(params: {
  contents: string;
  config: GenerateContentConfig;
}) {
  const ai = getAiClient();
  try {
    return await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: params.contents,
      config: params.config,
    });
  } catch {
    return await ai.models.generateContent({
      model: FALLBACK_MODEL,
      contents: params.contents,
      config: params.config,
    });
  }
}

export function buildDeterministicFallbackPlan(payload: GeneratePlanPayload) {
  const totalBudget = clampNumber(payload.totalBudget, 500, 1_000_000_000, 100000);
  const guestCount = clampNumber(payload.guestCount, 1, 100000, 100);
  const contingencyPct = clampNumber(payload.contingencyPercent, 0, 50, 8);
  const usableBudget = Math.round(totalBudget * (1 - contingencyPct / 100));
  const eventDate = sanitizeText(payload.eventDate, 32, '2027-03-15');
  const eventType = sanitizeText(payload.eventType, 60, 'Event');
  const city = sanitizeText(payload.city, 120, 'your city');
  const themeStyle = sanitizeText(payload.themeStyle, 240, 'Warm Contemporary Elegance');
  const venuePreference = sanitizeText(payload.venuePreference, 32, 'Hybrid');
  const foodPreference = sanitizeText(payload.foodPreference, 240, 'Curated Multi-Course Menu');
  const priorities = sanitizeText(payload.priorities, 240, 'Guest Experience and Affordability');
  const mustHaves = sanitizeText(payload.mustHaves, 240, 'core elements');
  const avoidItems = sanitizeText(payload.avoidItems, 240, 'unwanted items');

  return {
    isDeterministicFallback: true,
    aiConceptSummary: `[Deterministic Demo Fallback — Configure GEMINI_API_KEY for Live AI] A structured ${eventType} blueprint for ${guestCount} guests in ${city} designed around "${themeStyle}". Preserves ${contingencyPct}% contingency reserve while prioritizing ${priorities}.`,
    aiRisksAndContingencies: `1. Weather & Venue Backup (${venuePreference}): Confirm covered backup area 14 days prior. 2. Overlooked Costs: Account for generator backup, service taxes, and local sound permits within the ${contingencyPct}% contingency reserve.`,
    budgetItems: [
      {
        category: 'Venue',
        title: `${venuePreference} Venue Booking & Basic Seating`,
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
        title: `${foodPreference} (${guestCount} Guests)`,
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
        title: `Theme Decor: ${themeStyle}`,
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
    ],
    vendors: [
      {
        category: 'Venue',
        vendorName: `Suggested Archetype: ${venuePreference} Venue in ${city}`,
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

  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/ai', rateLimitMiddleware);

  app.get('/api/ai/status', (_req: Request, res: Response) => {
    const configured = checkGeminiConfigured();
    res.json({
      configured,
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      mode: configured ? 'live_gemini' : 'deterministic_fallback',
    });
  });

  // 1. Full AI Event Plan Engine (Wizard Step 5)
  app.post('/api/ai/generate-plan', async (req: Request, res: Response) => {
    const payload = (req.body || {}) as GeneratePlanPayload;

    if (!checkGeminiConfigured()) {
      res.json(buildDeterministicFallbackPlan(payload));
      return;
    }

    const cacheKey = `plan:${JSON.stringify(payload)}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const totalBudget = clampNumber(payload.totalBudget, 500, 1_000_000_000, 100000);
      const guestCount = clampNumber(payload.guestCount, 1, 100000, 100);
      const contingencyPct = clampNumber(payload.contingencyPercent, 0, 50, 8);
      const usableBudget = Math.round(totalBudget * (1 - contingencyPct / 100));
      const eventType = sanitizeText(payload.eventType, 60, 'Wedding');
      const title = sanitizeText(payload.title, 160, 'Untitled Event');
      const description = sanitizeText(payload.description, 800, 'N/A');
      const eventDate = sanitizeText(payload.eventDate, 32, '2027-03-15');
      const durationHours = clampNumber(payload.durationHours, 1, 240, 6);
      const city = sanitizeText(payload.city, 120, 'Mumbai');
      const currency = sanitizeText(payload.currency, 8, 'INR');
      const themeStyle = sanitizeText(payload.themeStyle, 240, 'Classic');
      const venuePreference = sanitizeText(payload.venuePreference, 32, 'Hybrid');
      const foodPreference = sanitizeText(payload.foodPreference, 240, 'Regional Menu');
      const culturalNotes = sanitizeText(payload.culturalNotes, 400, 'None specified');
      const mustHaves = sanitizeText(payload.mustHaves, 400, 'None');
      const avoidItems = sanitizeText(payload.avoidItems, 400, 'None');
      const priorities = sanitizeText(payload.priorities, 240, 'Guest Experience');

      const prompt = `Generate a complete, realistic, culturally and regionally grounded event plan for Planora AI:
- Event Type: ${eventType}
- Title: ${title}
- Description: ${description}
- Event Date: ${eventDate} (Current Date: ${todayStr} — if the event date is within 14 days, prioritize urgent immediate tasks!)
- Duration: ${durationHours} hours
- City / Location: ${city}
- Guest Count: ${guestCount}
- Total Budget: ${currency} ${totalBudget} (Contingency Reserve: ${contingencyPct}%, so allocate approximately ${currency} ${usableBudget} across categories)
- Preferred Theme & Style: ${themeStyle}
- Venue Preference: ${venuePreference}
- Food & Dietary Preferences: ${foodPreference}
- Cultural / Regional Preferences: ${culturalNotes}
- Must-Have Elements: ${mustHaves}
- Items to Avoid: ${avoidItems}
- Stated Priorities: ${priorities}

CRITICAL RULES:
1. Never invent fake real-world business phone numbers or claim a specific real-world vendor is confirmed. Prefix AI-suggested vendor entries with "Suggested Archetype:" and provide concrete selection criteria and questions to ask in "notes".
2. Ensure the sum of "plannedAmount" across all budgetItems is close to ${usableBudget} (${totalBudget} minus ${contingencyPct}% contingency). Set "actualAmount" to 0 and "paymentStatus" to "Unpaid" for a fresh plan.
3. Provide 6-7 budgetItems, 6-7 tasks with realistic YYYY-MM-DD dueDates between ${todayStr} and ${eventDate} and durationDays (between 3 and 18), 5-6 vendor archetypes, and 5 creative ideas across Decor, Food & Beverage, Entertainment, Invitations, and Activities.`;

      const response = await generateWithGemini({
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
                    durationDays: { type: Type.NUMBER },
                    priority: { type: Type.STRING },
                    category: { type: Type.STRING },
                    status: { type: Type.STRING },
                    assignee: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'description',
                    'dueDate',
                    'durationDays',
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

      const parsed = JSON.parse(response.text || '{}') as Record<string, unknown>;
      const result = {
        ...parsed,
        isDeterministicFallback: false,
      };
      setCachedResponse(cacheKey, result);
      res.json(result);
    } catch (error: unknown) {
      const errMessage =
        error instanceof Error
          ? error.message
          : 'Gemini API temporarily unavailable; using labeled deterministic plan.';
      res.json({
        ...buildDeterministicFallbackPlan(payload),
        fallbackReason: errMessage,
      });
    }
  });

  // 2. Optimize My Budget AI Action
  app.post('/api/ai/optimize-budget', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      event?: ServerEventInput;
      targetReductionPercent?: number;
    };
    const event = body.event;
    const targetReductionPercent = clampNumber(body.targetReductionPercent, 1, 50, 12);

    const buildFallbackAdjustments = () => {
      const items = (event?.budgetItems || []).map((item: ServerBudgetItemInput) => {
        const cat = String(item.category || 'General');
        const isProtected =
          cat.toLowerCase().includes('catering') ||
          cat.toLowerCase().includes('food');
        const factor = isProtected ? 0.96 : 1 - targetReductionPercent / 100;
        const planned = Number(item.plannedAmount) || 0;
        return {
          id: String(item.id || ''),
          category: cat,
          title: String(item.title || 'Expense'),
          currentPlanned: planned,
          recommendedPlanned: Math.round(planned * factor),
          rationale: isProtected
            ? 'Protected core hospitality priority (minimal 4% trim via seasonal menu swap).'
            : `Reduced by ${targetReductionPercent}% using off-peak package & local sourcing.`,
        };
      });
      return {
        isDeterministicFallback: true,
        strategySummary:
          '[Deterministic Optimization Preview] Preserves guest culinary experience while trimming non-essential decor and rental overhead.',
        adjustments: items,
      };
    };

    if (!checkGeminiConfigured()) {
      res.json(buildFallbackAdjustments());
      return;
    }

    try {
      const prompt = `Optimize the budget for this event while strictly respecting the user's stated priorities:
- Event: ${sanitizeText(event?.title, 160, 'Event')} (${sanitizeText(event?.eventType, 60, 'Wedding')}, ${clampNumber(event?.guestCount, 1, 100000, 100)} guests, ${sanitizeText(event?.city, 120, 'City')})
- Total Budget Cap: ${sanitizeText(event?.currency, 8, 'INR')} ${clampNumber(event?.totalBudget, 0, 1_000_000_000, 100000)} (Contingency: ${clampNumber(event?.contingencyPercent, 0, 50, 8)}%)
- User Priorities: ${sanitizeText(event?.priorities, 240, 'Guest Experience')}
- Must-Haves: ${sanitizeText(event?.mustHaves, 300, 'None')}
- Current Budget Items: ${JSON.stringify(
        (event?.budgetItems || []).map((b: ServerBudgetItemInput) => ({
          id: b.id,
          category: b.category,
          title: b.title,
          plannedAmount: b.plannedAmount,
        }))
      )}

Propose a realistic optimization that brings total planned spending comfortably within the usable budget (or saves ~${targetReductionPercent}%) while protecting the user's top priorities. Return the exact item "id" for each adjustment.`;

      const response = await generateWithGemini({
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
        ...(JSON.parse(response.text || '{}') as Record<string, unknown>),
        isDeterministicFallback: false,
      });
    } catch {
      res.json(buildFallbackAdjustments());
    }
  });

  // 3. AI Planning Copilot (with explicit user confirmation for state changes)
  app.post('/api/ai/copilot', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      event?: ServerEventInput;
      userMessage?: string;
    };
    const event = body.event;
    const userMessage = sanitizeText(body.userMessage, 1000, 'Analyze my event plan.');

    const buildFallbackCopilot = () => ({
      isDeterministicFallback: true,
      reply: `[Demo Copilot Mode] Based on "${sanitizeText(event?.title, 120, 'your event')}" (${clampNumber(event?.guestCount, 1, 100000, 100)} guests, budget ${sanitizeText(event?.currency, 8, 'INR')} ${clampNumber(event?.totalBudget, 0, 1_000_000_000, 100000)}), I recommend reviewing your top 3 cost centers and locking high-priority tasks due in the next 14 days. You can preview and confirm the proposed adjustment below.`,
      proposedChanges: [
        {
          type: 'add_task',
          summaryLabel: 'Add Task: Confirm Final Vendor Payment & Delivery Schedule',
          payload: {
            title: 'Confirm Final Vendor Payment & Delivery Schedule',
            description: 'Verify arrival times and balance invoices for all booked vendors.',
            dueDate: sanitizeText(event?.eventDate, 32, '2027-02-01'),
            priority: 'High',
            category: 'Operations',
          },
        },
      ],
    });

    if (!checkGeminiConfigured()) {
      res.json(buildFallbackCopilot());
      return;
    }

    try {
      const prompt = `Current Saved Event Context:
- Event: ${sanitizeText(event?.title, 160, 'Event')} (${sanitizeText(event?.eventType, 60, 'Wedding')})
- Date: ${sanitizeText(event?.eventDate, 32, '2027-03-15')} | City: ${sanitizeText(event?.city, 120, 'City')} | Venue: ${sanitizeText(event?.venuePreference, 32, 'Hybrid')}
- Guests: ${clampNumber(event?.guestCount, 1, 100000, 100)} | Total Budget: ${sanitizeText(event?.currency, 8, 'INR')} ${clampNumber(event?.totalBudget, 0, 1_000_000_000, 100000)} (Contingency: ${clampNumber(event?.contingencyPercent, 0, 50, 8)}%)
- Priorities: ${sanitizeText(event?.priorities, 240, 'Guest Experience')} | Food: ${sanitizeText(event?.foodPreference, 240, 'Regional')}
- Current Budget Items: ${JSON.stringify(
        (event?.budgetItems || []).map((b: ServerBudgetItemInput) => ({
          category: b.category,
          title: b.title,
          plannedAmount: b.plannedAmount,
          actualAmount: b.actualAmount,
        }))
      )}
- Current Tasks Count: ${(event?.tasks || []).length}
- Current Vendors: ${JSON.stringify(
        (event?.vendors || []).map((v: ServerVendorInput) => ({
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

      const response = await generateWithGemini({
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
        ...(JSON.parse(response.text || '{}') as Record<string, unknown>),
        isDeterministicFallback: false,
      });
    } catch {
      res.json(buildFallbackCopilot());
    }
  });

  // 4. Scenario Simulator ("What If?" AI Trade-Off Explanation)
  app.post('/api/ai/simulate-scenario', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      currentPlan?: Record<string, unknown>;
      simulatedScenario?: Record<string, unknown>;
    };
    const currentPlan = body.currentPlan || {};
    const simulatedScenario = body.simulatedScenario || {};

    const buildFallbackScenario = () => ({
      isDeterministicFallback: true,
      tradeOffAnalysis: `[Deterministic Trade-Off Summary] Shifting from ${clampNumber(currentPlan.guestCount, 1, 100000, 100)} to ${clampNumber(simulatedScenario.guestCount, 1, 100000, 100)} guests with a ${sanitizeText(simulatedScenario.cateringTier, 60, 'Signature')} catering tier and ${sanitizeText(simulatedScenario.venuePreference, 32, 'Hybrid')} venue changes variable hospitality costs while fixed production costs (photography, entertainment) remain stable.`,
      recommendations: [
        'Lock catering per-plate slabs for the new guest count tier before paying the venue deposit.',
        'Adjust contingency reserve if switching from Indoor to Outdoor to cover weather backup.',
      ],
    });

    if (!checkGeminiConfigured()) {
      res.json(buildFallbackScenario());
      return;
    }

    const cacheKey = `sim:${JSON.stringify({ currentPlan, simulatedScenario })}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const prompt = `Compare the Current Plan vs. the Proposed "What If?" Scenario and explain the practical trade-offs:
Current Plan:
- Guests: ${clampNumber(currentPlan.guestCount, 1, 100000, 100)} | Total Budget: ${sanitizeText(currentPlan.currency, 8, 'INR')} ${clampNumber(currentPlan.totalBudget, 0, 1_000_000_000, 100000)}
- Date: ${sanitizeText(currentPlan.eventDate, 32, '2027-03-15')} | Venue Type: ${sanitizeText(currentPlan.venuePreference, 32, 'Hybrid')}
- Priorities: ${sanitizeText(currentPlan.priorities, 240, 'Guest Experience')}

Proposed Scenario:
- Guests: ${clampNumber(simulatedScenario.guestCount, 1, 100000, 100)} | Total Budget: ${sanitizeText(currentPlan.currency, 8, 'INR')} ${clampNumber(simulatedScenario.totalBudget, 0, 1_000_000_000, 100000)}
- Date: ${sanitizeText(simulatedScenario.eventDate, 32, '2027-03-15')} | Venue Type: ${sanitizeText(simulatedScenario.venuePreference, 32, 'Hybrid')}
- Catering Tier: ${sanitizeText(simulatedScenario.cateringTier, 60, 'Signature')} | Priority Focus: ${sanitizeText(simulatedScenario.priorityFocus, 240, 'Guest Experience')}
- Calculated New Total Planned Spend: ${sanitizeText(currentPlan.currency, 8, 'INR')} ${clampNumber(simulatedScenario.projectedTotalSpend, 0, 1_000_000_000, 0)}
- Calculated Remaining Balance: ${sanitizeText(currentPlan.currency, 8, 'INR')} ${clampNumber(simulatedScenario.projectedRemaining, -1_000_000_000, 1_000_000_000, 0)}

Provide a clear 2-3 sentence trade-off analysis and 3 concrete recommendations.`;

      const response = await generateWithGemini({
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

      const result = {
        ...(JSON.parse(response.text || '{}') as Record<string, unknown>),
        isDeterministicFallback: false,
      };
      setCachedResponse(cacheKey, result);
      res.json(result);
    } catch {
      res.json(buildFallbackScenario());
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
    app.use(
      express.static(distPath, {
        maxAge: '1d',
        etag: true,
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Planora AI server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
