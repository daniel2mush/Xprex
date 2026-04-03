// config/rateLimiter.ts
import { RateLimiterRedis } from "rate-limiter-flexible";
import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";
import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "@social/redis-client";

// --- Global Rate Limiter ---
let globalRateLimiter: RateLimiterRedis | null = null;

export const globalRateLimitterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Lazily safely initialize the limiter so we can properly await the Redis client
    if (!globalRateLimiter) {
      const redisClient = await getRedisClient();
      globalRateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: "middleware",
        points: 50,
        duration: 1, // 50 requests per second per IP
      });
    }

    await globalRateLimiter.consume(req.ip || "unknown");
    next();
  } catch (rejRes: any) {
    // RateLimiterRedis throws an object containing msBeforeNext on rejection
    const retryAfterSeconds = Math.round((rejRes?.msBeforeNext || 1000) / 1000);

    res.status(429).json({
      success: false,
      message: "Too many requests",
      retryAfter: retryAfterSeconds,
    });
  }
};

// --- Sensitive Endpoints Rate Limiter ---
export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  // 👇 REMOVED the custom keyGenerator to prevent the IPv6 crash
  handler: (req: Request, res: Response) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests on sensitive endpoint. Try again later.",
    });
  },
  store: new RedisStore({
    sendCommand: async (...args: string[]) => {
      const client = await getRedisClient();
      const reply = await client.call(...(args as [string, ...string[]]));
      return reply as any;
    },
  }),
});
