/**
 * Structured client-side diagnostic logger so no catch blocks fail silently.
 */

export interface ClientLogMeta {
  context: string;
  error?: unknown;
  details?: Record<string, unknown>;
}

/**
 * Formats an unknown error into a safe string message for client diagnostics.
 * @param error Unknown caught value.
 * @returns Readable error summary.
 */
export function formatClientError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? 'Unknown client error');
}

/**
 * Logs a non-fatal warning in the client runtime (e.g., storage quota or clipboard fallback).
 * @param meta Structured context and error metadata.
 */
export function logClientWarning(meta: ClientLogMeta): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[Planora Client Warning] ${meta.context}:`, formatClientError(meta.error));
  }
}

/**
 * Logs an unexpected client runtime error for diagnostics.
 * @param meta Structured context and error metadata.
 */
export function logClientError(meta: ClientLogMeta): void {
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(`[Planora Client Error] ${meta.context}:`, formatClientError(meta.error));
  }
}
