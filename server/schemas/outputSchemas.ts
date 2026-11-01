import { z } from 'zod';
import {
  SERVER_CONFIG,
  sanitizeText,
  clampNumber,
} from '../config';
import {
  CopilotChangeType,
  ProposedCopilotChange,
} from '../../shared/types';

export const ALLOWED_COPILOT_CHANGE_TYPES: readonly CopilotChangeType[] = [
  'update_budget_total',
  'update_guest_count',
  'scale_budget_items',
  'add_budget_item',
  'add_task',
  'add_vendor',
  'add_idea',
] as const;

const GeminiBudgetItemOutputSchema = z
  .object({
    category: z.string(),
    title: z.string(),
    plannedAmount: z.number(),
    quotedAmount: z.number().optional(),
    actualAmount: z.number().optional(),
    lowEstimate: z.number().optional(),
    highEstimate: z.number().optional(),
    paymentStatus: z.string().optional(),
    notes: z.string().optional(),
  })
  .transform((item) => {
    const plannedAmount = clampNumber(item.plannedAmount, 0, 1_000_000_000, 0);
    const paymentStatusRaw = sanitizeText(item.paymentStatus, 24, 'Unpaid');
    const paymentStatus =
      paymentStatusRaw === 'Paid' ||
      paymentStatusRaw === 'Partial' ||
      paymentStatusRaw === 'Unpaid'
        ? paymentStatusRaw
        : 'Unpaid';
    return {
      category: sanitizeText(item.category, 80, 'General'),
      title: sanitizeText(item.title, 160, 'Line Item'),
      plannedAmount,
      quotedAmount: clampNumber(item.quotedAmount, 0, 1_000_000_000, 0),
      actualAmount: clampNumber(item.actualAmount, 0, 1_000_000_000, 0),
      lowEstimate: clampNumber(
        item.lowEstimate,
        0,
        1_000_000_000,
        Math.round(plannedAmount * 0.85)
      ),
      highEstimate: clampNumber(
        item.highEstimate,
        0,
        1_000_000_000,
        Math.round(plannedAmount * 1.15)
      ),
      paymentStatus,
      notes: sanitizeText(item.notes, 600, ''),
    };
  });

const GeminiTaskOutputSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    durationDays: z.number().optional(),
    priority: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    assignee: z.string().optional(),
  })
  .transform((task) => {
    const priorityRaw = sanitizeText(task.priority, 16, 'Medium');
    const priority =
      priorityRaw === 'High' ||
      priorityRaw === 'Medium' ||
      priorityRaw === 'Low'
        ? priorityRaw
        : 'Medium';
    const statusRaw = sanitizeText(task.status, 24, 'Todo');
    const status =
      statusRaw === 'Done' ||
      statusRaw === 'In Progress' ||
      statusRaw === 'Todo'
        ? statusRaw
        : 'Todo';
    return {
      title: sanitizeText(task.title, 180, 'Planning Milestone'),
      description: sanitizeText(task.description, 600, ''),
      dueDate: sanitizeText(task.dueDate, 32, '2027-03-15'),
      durationDays: Math.round(clampNumber(task.durationDays, 1, 180, 5)),
      priority,
      category: sanitizeText(task.category, 80, 'Operations'),
      status,
      assignee: sanitizeText(task.assignee, 80, 'Lead Planner'),
    };
  });

const GeminiVendorOutputSchema = z
  .object({
    category: z.string(),
    vendorName: z.string(),
    contactInfo: z.string().optional(),
    estimatedPrice: z.number(),
    quotedAmount: z.number().optional(),
    bookingStatus: z.string().optional(),
    followUpDate: z.string().optional(),
    notes: z.string().optional(),
  })
  .transform((vendor) => {
    const statusRaw = sanitizeText(vendor.bookingStatus, 24, 'Shortlisted');
    const bookingStatus =
      statusRaw === 'Booked' ||
      statusRaw === 'Negotiating' ||
      statusRaw === 'Contacted' ||
      statusRaw === 'Shortlisted' ||
      statusRaw === 'Declined'
        ? statusRaw
        : 'Shortlisted';
    return {
      category: sanitizeText(vendor.category, 80, 'General'),
      vendorName: sanitizeText(vendor.vendorName, 140, 'Vendor Partner'),
      contactInfo: sanitizeText(vendor.contactInfo, 200, ''),
      estimatedPrice: clampNumber(vendor.estimatedPrice, 0, 1_000_000_000, 0),
      quotedAmount: clampNumber(vendor.quotedAmount, 0, 1_000_000_000, 0),
      bookingStatus,
      followUpDate: sanitizeText(vendor.followUpDate, 32, '2027-02-15'),
      notes: sanitizeText(vendor.notes, 600, ''),
    };
  });

const GeminiIdeaOutputSchema = z
  .object({
    category: z.string().optional(),
    title: z.string(),
    description: z.string(),
    estimatedCostImpact: z.string().optional(),
    executionTip: z.string().optional(),
  })
  .transform((idea) => ({
    category: sanitizeText(idea.category, 80, 'Experience'),
    title: sanitizeText(idea.title, 160, 'Creative Concept'),
    description: sanitizeText(idea.description, 600, ''),
    estimatedCostImpact: sanitizeText(
      idea.estimatedCostImpact,
      120,
      'Included in budget'
    ),
    executionTip: sanitizeText(idea.executionTip, 400, ''),
  }));

export const GeminiPlanResponseSchema = z.object({
  aiConceptSummary: z
    .string()
    .transform((s) => sanitizeText(s, 1200, 'Tailored event blueprint.')),
  aiRisksAndContingencies: z
    .string()
    .transform((s) =>
      sanitizeText(s, 1500, 'Maintain contingency reserve and confirm contracts.')
    ),
  budgetItems: z
    .array(GeminiBudgetItemOutputSchema)
    .min(1)
    .max(SERVER_CONFIG.MAX_BUDGET_ITEMS),
  tasks: z
    .array(GeminiTaskOutputSchema)
    .min(1)
    .max(SERVER_CONFIG.MAX_TASKS),
  vendors: z
    .array(GeminiVendorOutputSchema)
    .max(SERVER_CONFIG.MAX_VENDORS),
  ideas: z.array(GeminiIdeaOutputSchema).max(30),
});

export const GeminiOptimizeResponseSchema = z.object({
  strategySummary: z
    .string()
    .transform((s) =>
      sanitizeText(s, 1200, 'Rebalanced non-locked budget allocations.')
    ),
  adjustments: z
    .array(
      z
        .object({
          id: z.string(),
          category: z.string(),
          title: z.string(),
          currentPlanned: z.number(),
          recommendedPlanned: z.number(),
          rationale: z.string(),
        })
        .transform((adj) => ({
          id: sanitizeText(adj.id, 128, ''),
          category: sanitizeText(adj.category, 80, 'General'),
          title: sanitizeText(adj.title, 160, 'Line Item'),
          currentPlanned: clampNumber(adj.currentPlanned, 0, 1_000_000_000, 0),
          recommendedPlanned: clampNumber(
            adj.recommendedPlanned,
            0,
            1_000_000_000,
            0
          ),
          rationale: sanitizeText(adj.rationale, 500, ''),
        }))
    )
    .max(SERVER_CONFIG.MAX_BUDGET_ITEMS),
});

export const GeminiSimulateResponseSchema = z.object({
  tradeOffAnalysis: z
    .string()
    .transform((s) =>
      sanitizeText(s, 1500, 'Compared baseline and simulated scenario.')
    ),
  recommendations: z
    .array(z.string().transform((s) => sanitizeText(s, 400, '')))
    .max(20),
});

/**
 * Validates and clamps a raw copilot `proposedChange` item.
 * Returns `null` if the type is not one of the 7 allowed types or if structure is invalid.
 */
export function sanitizeCopilotProposedChange(
  raw: unknown
): ProposedCopilotChange | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const rawType = typeof item.type === 'string' ? item.type.trim() : '';

  if (
    !ALLOWED_COPILOT_CHANGE_TYPES.includes(rawType as CopilotChangeType)
  ) {
    return null;
  }

  const type = rawType as CopilotChangeType;
  const summaryLabel = sanitizeText(
    item.summaryLabel,
    200,
    `Apply ${type.replace(/_/g, ' ')}`
  );
  const rawPayload =
    item.payload &&
    typeof item.payload === 'object' &&
    !Array.isArray(item.payload)
      ? (item.payload as Record<string, unknown>)
      : {};

  const priorityRaw = sanitizeText(rawPayload.priority, 16, 'High');
  const priority: 'High' | 'Medium' | 'Low' =
    priorityRaw === 'High' || priorityRaw === 'Medium' || priorityRaw === 'Low'
      ? priorityRaw
      : 'High';

  return {
    type,
    summaryLabel,
    payload: {
      ...(rawPayload.newTotalBudget !== undefined
        ? {
            newTotalBudget: clampNumber(
              rawPayload.newTotalBudget,
              100,
              1_000_000_000,
              100000
            ),
          }
        : {}),
      ...(rawPayload.newGuestCount !== undefined
        ? {
            newGuestCount: Math.round(
              clampNumber(rawPayload.newGuestCount, 1, 100000, 100)
            ),
          }
        : {}),
      ...(rawPayload.scaleCateringFactor !== undefined
        ? {
            scaleCateringFactor: clampNumber(
              rawPayload.scaleCateringFactor,
              0.1,
              3,
              1
            ),
          }
        : {}),
      ...(rawPayload.scaleFactor !== undefined
        ? {
            scaleFactor: clampNumber(rawPayload.scaleFactor, 0.1, 3, 0.85),
          }
        : {}),
      ...(rawPayload.excludeCategory !== undefined
        ? {
            excludeCategory: sanitizeText(
              rawPayload.excludeCategory,
              80,
              'catering'
            ),
          }
        : {}),
      ...(rawPayload.category !== undefined
        ? { category: sanitizeText(rawPayload.category, 80, 'General') }
        : {}),
      ...(rawPayload.title !== undefined
        ? { title: sanitizeText(rawPayload.title, 160, summaryLabel) }
        : {}),
      ...(rawPayload.plannedAmount !== undefined
        ? {
            plannedAmount: clampNumber(
              rawPayload.plannedAmount,
              0,
              1_000_000_000,
              5000
            ),
          }
        : {}),
      ...(rawPayload.notes !== undefined
        ? { notes: sanitizeText(rawPayload.notes, 600, '') }
        : {}),
      ...(rawPayload.description !== undefined
        ? { description: sanitizeText(rawPayload.description, 600, '') }
        : {}),
      ...(rawPayload.dueDate !== undefined
        ? { dueDate: sanitizeText(rawPayload.dueDate, 32, '2027-03-15') }
        : {}),
      ...(rawPayload.priority !== undefined ? { priority } : {}),
      ...(rawPayload.vendorName !== undefined
        ? { vendorName: sanitizeText(rawPayload.vendorName, 140, summaryLabel) }
        : {}),
      ...(rawPayload.estimatedPrice !== undefined
        ? {
            estimatedPrice: clampNumber(
              rawPayload.estimatedPrice,
              0,
              1_000_000_000,
              10000
            ),
          }
        : {}),
      ...(rawPayload.estimatedCostImpact !== undefined
        ? {
            estimatedCostImpact: sanitizeText(
              rawPayload.estimatedCostImpact,
              120,
              'Within budget'
            ),
          }
        : {}),
      ...(rawPayload.executionTip !== undefined
        ? { executionTip: sanitizeText(rawPayload.executionTip, 500, '') }
        : {}),
    },
  };
}

export const GeminiCopilotResponseSchema = z.object({
  reply: z
    .string()
    .transform((s) =>
      sanitizeText(s, 3000, 'Here is my analysis of your event plan.')
    ),
  proposedChanges: z
    .array(z.unknown())
    .transform((items) =>
      items
        .map((item) => sanitizeCopilotProposedChange(item))
        .filter((x): x is ProposedCopilotChange => x !== null)
        .slice(0, 10)
    ),
});
