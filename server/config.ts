/**
 * Server configuration, environment defaults, and core input sanitization helpers.
 */

export const SERVER_CONFIG = {
  PORT: Number(process.env.PORT) || 3000,
  PRIMARY_MODEL: process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.8-flash',
  FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite',
  CACHE_TTL_MS: Number(process.env.AI_CACHE_TTL_MS) || 5 * 60 * 1000,
  MAX_CACHE_ENTRIES: Number(process.env.AI_MAX_CACHE_ENTRIES) || 64,
  RATE_WINDOW_MS: Number(process.env.RATE_WINDOW_MS) || 60 * 1000,
  RATE_MAX_GENERAL: Number(process.env.RATE_MAX_GENERAL) || 60,
  RATE_MAX_STRICT: Number(process.env.RATE_MAX_STRICT) || 20,
  RATE_MAX_BUCKETS: Number(process.env.RATE_MAX_BUCKETS) || 5000,
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || '256kb',
  MAX_BUDGET_ITEMS: 100,
  MAX_VENDORS: 100,
  MAX_TASKS: 200,
} as const;

/**
 * Strips control characters, trims whitespace, removes prompt-injection delimiter tags,
 * and truncates strings to `maxLength`.
 */
export function sanitizeText(
  value: unknown,
  maxLength: number,
  fallback = ''
): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\/?user_data>/gi, '')
    .trim();
  return (cleaned || fallback).slice(0, maxLength);
}

/**
 * Clamps an arbitrary input value into a finite number within `[min, max]`.
 */
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

/**
 * Wraps sanitized user-supplied text inside `<user_data>...</user_data>` tags
 * after stripping any nested `<user_data>` tags to prevent prompt injection.
 */
export function wrapUserData(
  value: unknown,
  maxLength: number,
  fallback = ''
): string {
  const safe = sanitizeText(value, maxLength, fallback).replace(
    /<\/?user_data>/gi,
    ''
  );
  return `<user_data>${safe}</user_data>`;
}

/**
 * Resolves the configured Gemini API key from environment variables.
 */
export function getResolvedApiKey(): string | undefined {
  const candidates = [process.env.API_KEY, process.env.GEMINI_API_KEY];
  for (const key of candidates) {
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 5) {
      return key.trim();
    }
  }
  return undefined;
}

/**
 * Returns true when a valid Gemini API key is configured in the server environment.
 */
export function checkGeminiConfigured(): boolean {
  return Boolean(getResolvedApiKey());
}
