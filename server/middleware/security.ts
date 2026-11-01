import { Request, Response, NextFunction } from 'express';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com https://*.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' ws: wss: https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://apis.google.com",
  "frame-ancestors 'self' https://*.google.com https://*.corp.google.com https://*.cloud.google.com https://*.run.app https:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

/**
 * Applies hardened HTTP security headers including Content-Security-Policy,
 * COOP (same-origin-allow-popups for Firebase Google Sign-In), CORP, HSTS in production,
 * and Cache-Control: no-store on /api routes.
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('Content-Security-Policy', CSP_DIRECTIVES);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader(
    'Cross-Origin-Resource-Policy',
    req.path.startsWith('/api') ? 'same-origin' : 'cross-origin'
  );

  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
}
