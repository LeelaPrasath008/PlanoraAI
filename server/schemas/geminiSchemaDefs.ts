import { Type, Schema } from '@google/genai';

/**
 * Shared budget item schema node for Gemini structured JSON generation.
 */
const BUDGET_ITEM_SCHEMA_NODE: Schema = {
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
};

/**
 * Shared task item schema node for Gemini structured JSON generation.
 */
const TASK_ITEM_SCHEMA_NODE: Schema = {
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
};

/**
 * Shared vendor item schema node for Gemini structured JSON generation.
 */
const VENDOR_ITEM_SCHEMA_NODE: Schema = {
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
};

/**
 * Shared creative idea schema node for Gemini structured JSON generation.
 */
const IDEA_ITEM_SCHEMA_NODE: Schema = {
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
};

/**
 * Gemini response schema for `/api/ai/generate-plan`.
 */
export const GEMINI_PLAN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    aiConceptSummary: {
      type: Type.STRING,
      description:
        'Personalized event concept, theme narrative, and budget strategy (2-4 sentences).',
    },
    aiRisksAndContingencies: {
      type: Type.STRING,
      description:
        '3 concrete potential risks, overlooked costs, and contingency recommendations.',
    },
    budgetItems: {
      type: Type.ARRAY,
      items: BUDGET_ITEM_SCHEMA_NODE,
    },
    tasks: {
      type: Type.ARRAY,
      items: TASK_ITEM_SCHEMA_NODE,
    },
    vendors: {
      type: Type.ARRAY,
      items: VENDOR_ITEM_SCHEMA_NODE,
    },
    ideas: {
      type: Type.ARRAY,
      items: IDEA_ITEM_SCHEMA_NODE,
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
};

/**
 * Gemini response schema for `/api/ai/optimize-budget`.
 */
export const GEMINI_OPTIMIZE_SCHEMA: Schema = {
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
};

/**
 * Gemini response schema for `/api/ai/copilot`.
 */
export const GEMINI_COPILOT_SCHEMA: Schema = {
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
};

/**
 * Gemini response schema for `/api/ai/simulate-scenario`.
 */
export const GEMINI_SIMULATE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tradeOffAnalysis: { type: Type.STRING },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['tradeOffAnalysis', 'recommendations'],
};
