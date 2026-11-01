/**
 * Structured server-side logger for Planora AI.
 * Avoids leaking raw internal details or stack traces to API clients while
 * recording structured diagnostics server-side.
 */

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  context: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

/**
 * Formats and writes a structured error log entry server-side.
 */
export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): LogEntry {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Unknown error';
  const entry: LogEntry = {
    level: 'error',
    context,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  if (process.env.NODE_ENV !== 'test') {
    console.error(JSON.stringify(entry));
  }
  return entry;
}

/**
 * Formats and writes a structured warning log entry server-side.
 */
export function logWarn(
  context: string,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  const entry: LogEntry = {
    level: 'warn',
    context,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  if (process.env.NODE_ENV !== 'test') {
    console.warn(JSON.stringify(entry));
  }
  return entry;
}

/**
 * Formats and writes a structured info log entry server-side.
 */
export function logInfo(
  context: string,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  const entry: LogEntry = {
    level: 'info',
    context,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
  if (process.env.NODE_ENV !== 'test') {
    console.log(JSON.stringify(entry));
  }
  return entry;
}
