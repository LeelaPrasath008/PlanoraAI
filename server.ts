import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  SERVER_CONFIG,
  sanitizeText,
  clampNumber,
  checkGeminiConfigured,
} from './server/config';
import { securityHeadersMiddleware } from './server/middleware/security';
import {
  createRateLimiter,
  RateLimiterOptions,
} from './server/middleware/rateLimit';
import { errorHandlerMiddleware } from './server/middleware/errorHandler';
import { buildDeterministicFallbackPlan } from './server/fallbacks/aiFallbacks';
import { createAiRouter } from './server/routes/ai';
import { GeminiService } from './server/services/gemini';
import { logInfo } from './server/logger';

export type {
  GeneratePlanPayload,
  ServerBudgetItemInput,
  ServerVendorInput,
  ServerEventInput,
} from './shared/types';

export {
  sanitizeText,
  clampNumber,
  buildDeterministicFallbackPlan,
  checkGeminiConfigured,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateAppOptions {
  geminiService?: GeminiService;
  rateLimitOptions?: RateLimiterOptions;
  bodyLimit?: string;
}

/**
 * Creates and configures the Express application with security headers,
 * body size limits, rate limiting, `/api/ai` routes, and error handling middleware.
 */
export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(
    express.json({ limit: options.bodyLimit || SERVER_CONFIG.JSON_BODY_LIMIT })
  );
  app.use('/api/ai', createRateLimiter(options.rateLimitOptions));
  app.use('/api/ai', createAiRouter(options.geminiService));
  app.use(errorHandlerMiddleware);

  return app;
}

/**
 * Starts the full-stack Planora AI server (mounting Vite middleware in development
 * or static dist assets in production) on port 3000.
 */
export async function startServer(): Promise<void> {
  const app = createApp();
  const PORT = SERVER_CONFIG.PORT;

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
    logInfo('server.start', `Planora AI server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
