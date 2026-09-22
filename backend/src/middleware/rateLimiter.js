import rateLimit from 'express-rate-limit';

/**
 * Authentication rate limiter for login and registration endpoints.
 * Mitigates brute-force attacks and credential stuffing attempts.
 *
 * Defaults to 50 attempts per 15-minute window per IP.
 * Configurable via AUTH_RATE_LIMIT_MAX environment variable.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.AUTH_RATE_LIMIT_MAX
    ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10)
    : 50,
  standardHeaders: true, // Draft-6/Draft-7 RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
  statusCode: 429,
});
