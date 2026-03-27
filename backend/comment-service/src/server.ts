import express, { NextFunction, Request, Response } from "express";
import logger from "./utils/logger";
import helmet from "helmet";
import { corsConfig } from "./config/corsConfig";
import { globalRateLimitterMiddleware } from "./middleware/rateLimiter";
import { globalErrorHandler } from "./middleware/errorHandler";
import { initRabbitMQ } from "@social/rabbitmq";

// ────────────────────────────────────────────────
import { getRedisClient } from "@social/redis-client";
import { env } from "./env";
import commentRoutes from "./routes/commentRoutes";
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
app.get("/api/comment/health", (req, res) => {
  res.status(200).json({ status: "Comment Service is running!" });
});

app.use("/api", commentRoutes);

app.use(globalErrorHandler);

app.listen(env.PORT, () => {
  logger.info(`Comment-service running on port ${env.PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});
