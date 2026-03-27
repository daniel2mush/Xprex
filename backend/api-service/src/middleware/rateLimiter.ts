// config/rateLimiter.ts
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";
import redisClient from "../utils/redisClient";
import { rateLimit } from "express-rate-limit";
import RedisStore, { RedisReply } from "rate-limit-redis";

const globalRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

export const globslRateLimitterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  globalRateLimiter
    .consume(req.ip!)
    .then(() => next())
    .catch(() => {
      res.status(429).json({ success: false, message: "Too many requests" });
    });
};

//sensitive endponts rate limitter with express-rate-limiter
export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: true,
  handler: (req: Request, res: Response) => {
    logger.warn(`Sensitive endpoint ratelimit exceeded for ip ${req.ip}`);
    res.status(429).json({
      message: "Too many requests on sensitive endpoint",
    });
  },
  store: new RedisStore({
    sendCommand: async (...args: String[]) =>
      redisClient.call(
        ...(args as [string, ...string[]]),
      ) as Promise<RedisReply>,
  }),
});
