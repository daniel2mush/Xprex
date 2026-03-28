import "dotenv/config";
import { consumeEvent, initRabbitMQ } from "@social/rabbitmq";
import { handleCommentCreated } from "./handlers/commentHandler";
import { handleLikeCreated } from "./handlers/likeHandler";
import { handleFollowCreated } from "./handlers/followHandler";
import { handleMessageCreated } from "./handlers/messageHandler";
import { handleRepostCreated } from "./handlers/repostHandler";
import logger from "./utils/logger";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { corsConfig } from "./config/corsConfig";
import { globalRateLimitterMiddleware } from "./middleware/rateLimiter";
import { globalErrorHandler } from "./middleware/errorHandler";
import notifcationRoutes from "./routes/notificationsRoutes";

// ────────────────────────────────────────────────
import { getRedisClient } from "@social/redis-client";
import { env } from "./env";

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

app.get("/api/notifications/health", (req, res) => {
  res.status(200).json({ status: "Notification Service is running!" });
});

app.use("/api", notifcationRoutes);

app.use(globalErrorHandler);

const start = async () => {
  await initRabbitMQ();

  await consumeEvent("social:comment-created", handleCommentCreated);
  await consumeEvent("social:like-created", handleLikeCreated);
  await consumeEvent("social:follow-created", handleFollowCreated);
  await consumeEvent("social:repost-created", handleRepostCreated);
  await consumeEvent("social:message-created", handleMessageCreated);

  logger.info("Notification service listening for events");
  app.listen(env.PORT, () => {
    logger.info(`Notification service is running on port ${env.PORT}`);
  });
};

start().catch((err) => {
  logger.error("Notification service failed to start", err);
  process.exit(1);
});
