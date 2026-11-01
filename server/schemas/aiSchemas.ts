import { z } from 'zod';
import {
  SERVER_CONFIG,
  sanitizeText,
  clampNumber,
} from '../config';

export {
  GEMINI_PLAN_SCHEMA,
  GEMINI_OPTIMIZE_SCHEMA,
  GEMINI_COPILOT_SCHEMA,
  GEMINI_SIMULATE_SCHEMA,
} from './geminiSchemaDefs';

export {
  ALLOWED_COPILOT_CHANGE_TYPES,
  GeminiPlanResponseSchema,
  GeminiOptimizeResponseSchema,
  GeminiSimulateResponseSchema,
  GeminiCopilotResponseSchema,
  sanitizeCopilotProposedChange,
} from './outputSchemas';

/* ============================================================================
 * Zod Request Body Validation Schemas (Rejects non-objects & caps arrays)
 * ========================================================================== */

const PlainObjectGuard = z.custom<Record<string, unknown>>(
  (val) => typeof val === 'object' && val !== null && !Array.isArray(val),
  { message: 'Request body must be a JSON object.' }
);

const ServerBudgetItemSchema = z
  .object({
    id: z.unknown().optional(),
    category: z.unknown().optional(),
    title: z.unknown().optional(),
    plannedAmount: z.unknown().optional(),
    actualAmount: z.unknown().optional(),
  })
  .transform((b) => ({
    id: sanitizeText(b.id, 128, ''),
    category: sanitizeText(b.category, 80, 'General'),
    title: sanitizeText(b.title, 160, 'Expense'),
    plannedAmount: clampNumber(b.plannedAmount, 0, 1_000_000_000, 0),
    actualAmount: clampNumber(b.actualAmount, 0, 1_000_000_000, 0),
  }));

const ServerVendorItemSchema = z
  .object({
    category: z.unknown().optional(),
    vendorName: z.unknown().optional(),
    estimatedPrice: z.unknown().optional(),
  })
  .transform((v) => ({
    category: sanitizeText(v.category, 80, 'General'),
    vendorName: sanitizeText(v.vendorName, 140, 'Vendor'),
    estimatedPrice: clampNumber(v.estimatedPrice, 0, 1_000_000_000, 0),
  }));

const ServerTaskItemSchema = z
  .object({
    id: z.unknown().optional(),
    title: z.unknown().optional(),
    status: z.unknown().optional(),
    priority: z.unknown().optional(),
    dueDate: z.unknown().optional(),
  })
  .transform((t) => ({
    id: sanitizeText(t.id, 128, ''),
    title: sanitizeText(t.title, 180, 'Task'),
    status: sanitizeText(t.status, 32, 'Todo'),
    priority: sanitizeText(t.priority, 32, 'Medium'),
    dueDate: sanitizeText(t.dueDate, 32, ''),
  }));

export const ServerEventInputSchema = PlainObjectGuard.pipe(
  z
    .object({
      title: z.unknown().optional(),
      type: z.unknown().optional(),
      date: z.unknown().optional(),
      location: z.unknown().optional(),
      guestCount: z.unknown().optional(),
      totalBudget: z.unknown().optional(),
      contingencyPercent: z.unknown().optional(),
      budgetItems: z
        .array(ServerBudgetItemSchema)
        .max(
          SERVER_CONFIG.MAX_BUDGET_ITEMS,
          `Maximum of ${SERVER_CONFIG.MAX_BUDGET_ITEMS} budget items allowed.`
        )
        .optional(),
      vendors: z
        .array(ServerVendorItemSchema)
        .max(
          SERVER_CONFIG.MAX_VENDORS,
          `Maximum of ${SERVER_CONFIG.MAX_VENDORS} vendors allowed.`
        )
        .optional(),
      tasks: z
        .array(ServerTaskItemSchema)
        .max(
          SERVER_CONFIG.MAX_TASKS,
          `Maximum of ${SERVER_CONFIG.MAX_TASKS} tasks allowed.`
        )
        .optional(),
    })
    .transform((e) => ({
      title: sanitizeText(e.title, 150, 'Untitled Event'),
      type: sanitizeText(e.type, 80, 'Special Event'),
      date: sanitizeText(e.date, 32, '2027-04-15'),
      location: sanitizeText(e.location, 150, 'Flexible Location'),
      guestCount: clampNumber(e.guestCount, 1, 100000, 100),
      totalBudget: clampNumber(e.totalBudget, 100, 1_000_000_000, 50000),
      contingencyPercent: clampNumber(e.contingencyPercent, 0, 50, 10),
      budgetItems: e.budgetItems ?? [],
      vendors: e.vendors ?? [],
      tasks: e.tasks ?? [],
    }))
);

/**
 * Validates and sanitizes `/api/ai/generate-plan` request bodies.
 */
export const GeneratePlanRequestSchema = PlainObjectGuard.pipe(
  z
    .object({
      title: z.unknown().optional(),
      type: z.unknown().optional(),
      date: z.unknown().optional(),
      location: z.unknown().optional(),
      venuePreference: z.unknown().optional(),
      guestCount: z.unknown().optional(),
      totalBudget: z.unknown().optional(),
      contingencyPercent: z.unknown().optional(),
      notes: z.unknown().optional(),
      priorities: z.unknown().optional(),
    })
    .transform((b) => ({
      title: sanitizeText(b.title, 150, 'Untitled Event'),
      type: sanitizeText(b.type, 80, 'Special Event'),
      date: sanitizeText(b.date, 32, '2027-04-15'),
      location: sanitizeText(b.location, 150, 'Flexible Location'),
      venuePreference: sanitizeText(b.venuePreference, 120, 'Flexible'),
      guestCount: clampNumber(b.guestCount, 1, 100000, 100),
      totalBudget: clampNumber(b.totalBudget, 100, 1_000_000_000, 50000),
      contingencyPercent: clampNumber(b.contingencyPercent, 0, 50, 10),
      notes: sanitizeText(b.notes, 1000, 'Standard quality expectations'),
      priorities: Array.isArray(b.priorities)
        ? b.priorities
            .slice(0, 12)
            .map((p) => sanitizeText(p, 80))
            .filter(Boolean)
        : [],
    }))
);

/**
 * Validates and sanitizes `/api/ai/optimize-budget` request bodies.
 */
export const OptimizeBudgetRequestSchema = PlainObjectGuard.pipe(
  z
    .object({
      event: ServerEventInputSchema.optional(),
      targetBudget: z.unknown().optional(),
      targetReductionPercent: z.unknown().optional(),
      lockedCategories: z.unknown().optional(),
    })
    .transform((b) => ({
      event: b.event,
      targetBudget:
        b.targetBudget !== undefined
          ? clampNumber(b.targetBudget, 100, 1_000_000_000, 50000)
          : undefined,
      targetReductionPercent: clampNumber(b.targetReductionPercent, 1, 50, 15),
      lockedCategories: Array.isArray(b.lockedCategories)
        ? b.lockedCategories
            .slice(0, 30)
            .map((c) => sanitizeText(c, 80))
            .filter(Boolean)
        : [],
    }))
);

/**
 * Validates and sanitizes `/api/ai/copilot` request bodies.
 */
export const CopilotRequestSchema = PlainObjectGuard.pipe(
  z
    .object({
      event: ServerEventInputSchema.optional(),
      userMessage: z.unknown().optional(),
    })
    .transform((b) => ({
      event: b.event,
      userMessage: sanitizeText(b.userMessage, 1000, 'Analyze my event plan.'),
    }))
);

/**
 * Validates and sanitizes `/api/ai/simulate-scenario` request bodies.
 */
export const SimulateScenarioRequestSchema = PlainObjectGuard.pipe(
  z
    .object({
      currentPlan: z.record(z.string(), z.unknown()).optional(),
      simulatedScenario: z.record(z.string(), z.unknown()).optional(),
    })
    .transform((b) => ({
      currentPlan: b.currentPlan ?? {},
      simulatedScenario: b.simulatedScenario ?? {},
    }))
);
