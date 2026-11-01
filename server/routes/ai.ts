import { Router, Request, Response } from 'express';
import { SERVER_CONFIG } from '../config';
import { logError } from '../logger';
import {
  GeminiService,
  defaultGeminiService,
  computeCacheKey,
  getCachedResponse,
  setCachedResponse,
} from '../services/gemini';
import {
  GEMINI_PLAN_SCHEMA,
  GEMINI_OPTIMIZE_SCHEMA,
  GEMINI_COPILOT_SCHEMA,
  GEMINI_SIMULATE_SCHEMA,
  GeneratePlanRequestSchema,
  OptimizeBudgetRequestSchema,
  CopilotRequestSchema,
  SimulateScenarioRequestSchema,
  GeminiPlanResponseSchema,
  GeminiOptimizeResponseSchema,
  GeminiCopilotResponseSchema,
  GeminiSimulateResponseSchema,
} from '../schemas/aiSchemas';
import {
  PLAN_SYSTEM_INSTRUCTION,
  OPTIMIZE_SYSTEM_INSTRUCTION,
  COPILOT_SYSTEM_INSTRUCTION,
  SIMULATE_SYSTEM_INSTRUCTION,
  buildGeneratePlanPrompt,
  buildOptimizeBudgetPrompt,
  buildCopilotPrompt,
  buildSimulateScenarioPrompt,
} from '../prompts/aiPrompts';
import {
  buildDeterministicFallbackPlan,
  buildDeterministicFallbackOptimization,
  buildDeterministicFallbackCopilot,
  buildDeterministicFallbackScenario,
} from '../fallbacks/aiFallbacks';

/**
 * Creates the Express router for `/api/ai/*` endpoints.
 * Accepts an optional `GeminiService` instance for dependency injection in tests.
 */
export function createAiRouter(
  geminiService: GeminiService = defaultGeminiService
): Router {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    const configured = geminiService.isConfigured();
    res.json({
      configured,
      fallbackAvailable: true,
      primaryModel: SERVER_CONFIG.PRIMARY_MODEL,
      fallbackModel: SERVER_CONFIG.FALLBACK_MODEL,
      mode: configured ? 'live_gemini' : 'deterministic_fallback',
    });
  });

  // 1. Full AI Event Plan Engine (Wizard Step 5)
  router.post('/generate-plan', async (req: Request, res: Response) => {
    const parsedReq = GeneratePlanRequestSchema.safeParse(req.body ?? {});
    if (!parsedReq.success) {
      res.status(400).json({
        error: 'Invalid event plan request parameters.',
        code: 'invalid_request',
      });
      return;
    }

    const payload = parsedReq.data;

    if (!geminiService.isConfigured()) {
      res.json(buildDeterministicFallbackPlan(payload));
      return;
    }

    const cacheKey = computeCacheKey('plan', payload);
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const prompt = buildGeneratePlanPrompt(payload);
      const rawText = await geminiService.generateJson({
        contents: prompt,
        config: {
          systemInstruction: PLAN_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_PLAN_SCHEMA,
        },
      });

      const parsedJson = JSON.parse(rawText || '{}');
      const validated = GeminiPlanResponseSchema.parse(parsedJson);
      const result: Record<string, unknown> = {
        ...validated,
        isDeterministicFallback: false,
        usedFallback: false,
      };
      setCachedResponse(cacheKey, result);
      res.json(result);
    } catch (error: unknown) {
      logError('ai.generatePlan', error);
      res.json(buildDeterministicFallbackPlan(payload));
    }
  });

  // 2. Optimize My Budget AI Action
  router.post('/optimize-budget', async (req: Request, res: Response) => {
    const parsedReq = OptimizeBudgetRequestSchema.safeParse(req.body ?? {});
    if (!parsedReq.success) {
      res.status(400).json({
        error: 'Invalid budget optimization request parameters.',
        code: 'invalid_request',
      });
      return;
    }

    const { event, targetReductionPercent } = parsedReq.data;

    if (!geminiService.isConfigured()) {
      res.json(
        buildDeterministicFallbackOptimization(event, targetReductionPercent)
      );
      return;
    }

    const cacheKey = computeCacheKey('opt', parsedReq.data);
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const prompt = buildOptimizeBudgetPrompt(event, targetReductionPercent);
      const rawText = await geminiService.generateJson({
        contents: prompt,
        config: {
          systemInstruction: OPTIMIZE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_OPTIMIZE_SCHEMA,
        },
      });

      const parsedJson = JSON.parse(rawText || '{}');
      const validated = GeminiOptimizeResponseSchema.parse(parsedJson);
      const result: Record<string, unknown> = {
        ...validated,
        isDeterministicFallback: false,
        usedFallback: false,
      };
      setCachedResponse(cacheKey, result);
      res.json(result);
    } catch (error: unknown) {
      logError('ai.optimizeBudget', error);
      res.json(
        buildDeterministicFallbackOptimization(event, targetReductionPercent)
      );
    }
  });

  // 3. AI Planning Copilot (with explicit user confirmation & clamped proposedChanges)
  router.post('/copilot', async (req: Request, res: Response) => {
    const parsedReq = CopilotRequestSchema.safeParse(req.body ?? {});
    if (!parsedReq.success) {
      res.status(400).json({
        error: 'Invalid copilot request parameters.',
        code: 'invalid_request',
      });
      return;
    }

    const { event, userMessage } = parsedReq.data;

    if (!geminiService.isConfigured()) {
      res.json(buildDeterministicFallbackCopilot(event));
      return;
    }

    const cacheKey = computeCacheKey('copilot', parsedReq.data);
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const prompt = buildCopilotPrompt(event, userMessage);
      const rawText = await geminiService.generateJson({
        contents: prompt,
        config: {
          systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_COPILOT_SCHEMA,
        },
      });

      const parsedJson = JSON.parse(rawText || '{}');
      const validated = GeminiCopilotResponseSchema.parse(parsedJson);
      const result: Record<string, unknown> = {
        ...validated,
        isDeterministicFallback: false,
        usedFallback: false,
      };
      setCachedResponse(cacheKey, result);
      res.json(result);
    } catch (error: unknown) {
      logError('ai.copilot', error);
      res.json(buildDeterministicFallbackCopilot(event));
    }
  });

  // 4. Scenario Simulator ("What If?" AI Trade-Off Explanation)
  router.post('/simulate-scenario', async (req: Request, res: Response) => {
    const parsedReq = SimulateScenarioRequestSchema.safeParse(req.body ?? {});
    if (!parsedReq.success) {
      res.status(400).json({
        error: 'Invalid scenario simulation request parameters.',
        code: 'invalid_request',
      });
      return;
    }

    const { currentPlan, simulatedScenario } = parsedReq.data;

    if (!geminiService.isConfigured()) {
      res.json(
        buildDeterministicFallbackScenario(currentPlan, simulatedScenario)
      );
      return;
    }

    const cacheKey = computeCacheKey('sim', { currentPlan, simulatedScenario });
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const prompt = buildSimulateScenarioPrompt(
        currentPlan,
        simulatedScenario
      );
      const rawText = await geminiService.generateJson({
        contents: prompt,
        config: {
          systemInstruction: SIMULATE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_SIMULATE_SCHEMA,
        },
      });

      const parsedJson = JSON.parse(rawText || '{}');
      const validated = GeminiSimulateResponseSchema.parse(parsedJson);
      const result: Record<string, unknown> = {
        ...validated,
        isDeterministicFallback: false,
      };
      setCachedResponse(cacheKey, result);
      res.json(result);
    } catch (error: unknown) {
      logError('ai.simulateScenario', error);
      res.json({
        ...buildDeterministicFallbackScenario(currentPlan, simulatedScenario),
        fallbackCode: 'ai_unavailable',
      });
    }
  });

  return router;
}
