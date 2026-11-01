import crypto from 'node:crypto';
import { GoogleGenAI, GenerateContentConfig } from '@google/genai';
import {
  SERVER_CONFIG,
  getResolvedApiKey,
  checkGeminiConfigured,
} from '../config';
import { logWarn } from '../logger';

export interface GeminiGenerateParams {
  contents: string;
  config: GenerateContentConfig;
}

export interface GeminiService {
  isConfigured: () => boolean;
  generateJson: (params: GeminiGenerateParams) => Promise<string>;
}

const aiResponseCache = new Map<
  string,
  { expiresAt: number; data: Record<string, unknown> }
>();

/**
 * Computes a collision-resistant SHA-256 cache key for a route prefix and payload.
 */
export function computeCacheKey(prefix: string, payload: unknown): string {
  const serialized = JSON.stringify(payload ?? {});
  const digest = crypto.createHash('sha256').update(serialized).digest('hex');
  return `${prefix}:${digest}`;
}

/**
 * Retrieves an unexpired cached response by key, or `null` if missing/expired.
 */
export function getCachedResponse(
  key: string
): Record<string, unknown> | null {
  const entry = aiResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aiResponseCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Stores a response in the bounded LRU cache with TTL expiration.
 */
export function setCachedResponse(
  key: string,
  data: Record<string, unknown>
): void {
  if (
    aiResponseCache.size >= SERVER_CONFIG.MAX_CACHE_ENTRIES &&
    !aiResponseCache.has(key)
  ) {
    const oldestKey = aiResponseCache.keys().next().value;
    if (oldestKey) aiResponseCache.delete(oldestKey);
  }
  aiResponseCache.set(key, {
    expiresAt: Date.now() + SERVER_CONFIG.CACHE_TTL_MS,
    data,
  });
}

/**
 * Clears all entries from the in-memory AI response cache (used in tests).
 */
export function clearResponseCache(): void {
  aiResponseCache.clear();
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

/**
 * Calls the primary Gemini model (`gemini-3.8-flash`) and automatically falls back
 * to `gemini-3.1-flash-lite` if the primary model fails.
 */
export async function generateWithGemini(
  params: GeminiGenerateParams
): Promise<string> {
  const ai = getAiClient();
  try {
    const res = await ai.models.generateContent({
      model: SERVER_CONFIG.PRIMARY_MODEL,
      contents: params.contents,
      config: params.config,
    });
    return res.text || '{}';
  } catch (primaryErr) {
    logWarn(
      'gemini.primaryModelFailed',
      'Primary Gemini model failed; retrying with fallback model',
      {
        primaryModel: SERVER_CONFIG.PRIMARY_MODEL,
        fallbackModel: SERVER_CONFIG.FALLBACK_MODEL,
        reason:
          primaryErr instanceof Error ? primaryErr.message : String(primaryErr),
      }
    );
    const fallbackRes = await ai.models.generateContent({
      model: SERVER_CONFIG.FALLBACK_MODEL,
      contents: params.contents,
      config: params.config,
    });
    return fallbackRes.text || '{}';
  }
}

/**
 * Default production GeminiService implementation.
 */
export const defaultGeminiService: GeminiService = {
  isConfigured: checkGeminiConfigured,
  generateJson: generateWithGemini,
};
