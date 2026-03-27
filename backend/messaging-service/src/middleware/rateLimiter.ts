import { rateLimit } from "express-rate-limit";

export const globalRateLimitterMiddleware = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again in a moment.",
  },
});
