import * as dotenv from "dotenv";
dotenv.config();

import express, { NextFunction, Request, Response } from "express";

// ────────────────────────────────────────────────
import { getRedisClient } from "@social/redis-client";
import { Env } from "./env";
import { initRabbitMQ } from "@social/rabbitmq";
import helmet from "helmet";
import { corsConfig } from "./config/corsConfig";
import { globalErrorHandler } from "./middleware/errorHandler";
import { globalRateLimitterMiddleware } from "./middleware/rateLimiter";
import logger from "./utils/logger";
import SearchRoute from "./routes/searchRoutes";
import { consumeEvent, getPublisherChannel } from "@social/rabbitmq";
import { handlePostCreation } from "./events/rabbitmqevents";
// ────────────────────────────────────────────────

const app = express();

// Attach redis client **once per request** (lazy — connects only when first used)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.redisClient = await getRedisClient();
    next();
  } catch (err) {
    logger.error("Failed to get Redis client", err);
    res.status(503).json({ error: "Service unavailable (Redis)" });
  }
});

// Middleware
app.use(express.json());
app.use(helmet());
app.use(corsConfig);

app.use((req: Request, res: Response, next) => {
  logger.info(`Received ${req.method} ${req.url}`);
  if (Object.keys(req.body || {}).length) {
    logger.info(`Request body: ${JSON.stringify(req.body, null, 2)}`);
  }
  next();
});

// RabbitMQ
async function connectToRabbitMQ() {
  try {
    await initRabbitMQ();
  } catch (err) {
    logger.error("RabbitMQ init failed", err);
  }
}
connectToRabbitMQ();

// Rate limiting
app.use(globalRateLimitterMiddleware);

// Health
app.get("/api/search/health", (req, res) => {
  res.status(200).json({ status: "Search Service is running!" });
});

app.use("/api/search", SearchRoute);

app.use(globalErrorHandler);

async function runnApp() {
  try {
    consumeEvent("social:post-created", handlePostCreation);
    app.listen(Env.PORT, () => {
      logger.info(`Search-service running on port ${Env.PORT}`);
    });
  } catch (error) {
    logger.error("Error occured while staring app", error);
  }
}

runnApp();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});
