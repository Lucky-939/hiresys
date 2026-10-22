import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
  message: { success: false, message: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  message: { success: false, message: "Too many authentication attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 requests per `window` (here, per 1 hour)
  message: { success: false, message: "Too many AI requests, please try again after an hour" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 applications per hour
  statusCode: 429,
  message: {
    success: false,
    message: "Too many applications submitted from this IP. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicJobViewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 minutes
  statusCode: 429,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
