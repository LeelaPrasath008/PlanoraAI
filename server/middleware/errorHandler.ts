import { Request, Response, NextFunction } from 'express';
import { logError } from '../logger';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

/**
 * Final Express error-handling middleware.
 * Handles 413 Payload Too Large and 400 Malformed JSON cleanly, and returns
 * a generic 500 JSON payload without leaking stack traces or internal errors.
 */
export function errorHandlerMiddleware(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || err.statusCode || 500;

  if (status === 413 || err.type === 'entity.too.large') {
    res.status(413).json({
      error: 'Request payload is too large.',
      code: 'payload_too_large',
    });
    return;
  }

  if (
    status === 400 ||
    err instanceof SyntaxError ||
    err.type === 'entity.parse.failed'
  ) {
    res.status(400).json({
      error: 'Invalid JSON request body.',
      code: 'invalid_json',
    });
    return;
  }

  logError('express.errorHandler', err, {
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    error: 'An unexpected server error occurred.',
    code: 'internal_error',
  });
}
