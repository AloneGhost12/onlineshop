const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

const apiWindowMs = (parseInt(process.env.API_RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000;
const authWindowMs = (parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000;

const apiMax = parseInt(process.env.API_RATE_LIMIT_MAX, 10) || (isProduction ? 100 : 1000);
const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || (isProduction ? 10 : 100);

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
