import express, { NextFunction, Request, Response } from "express";
import logger from "./utils/logger";
import helmet from "helmet";
import { corsConfig } from "./config/corsConfig";
import { globalRateLimitterMiddleware } from "./middleware/rateLimiter";
import { globalErrorHandler } from "./middleware/errorHandler";
import authRoute from "./routes/authRoutes";

import { getRedisClient } from "@social/redis-client";

//app
const app = express();

const PORT = process.env.PORT || 4001;

// // Redis Client
app.use(async (req: Request, res: Response, next: NextFunction) => {
  req.redisClient = await getRedisClient();
  next();
});
// //middleware
app.use(express.json());
app.use(helmet());
app.use(corsConfig);
app.use((req: Request, res: Response, next) => {
  logger.info(`Received ${req.method} from ${req.url}`);
  logger.info(`Request body ${JSON.stringify(req.body)}`);
  next();
});

// //DDos protection and rate lmiiting
app.use(globalRateLimitterMiddleware);

//Sensitive endpoints rate limiter

app.get("/api/auth/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "Auth Service is running!" });
});

app.use("/api/auth", authRoute);

app.use(globalErrorHandler);

app.listen(PORT, () => {
  logger.info(`Auth service listening on port ${PORT}`);
});

process.on("uncaughtExceptionMonitor", (reason, promise) => {
  logger.error("Unhandle Rejection at", promise, "reason", reason);
});
