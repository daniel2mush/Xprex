import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { corsConfig } from "./config/corsConfig";
import { globalRateLimitterMiddleware } from "./middleware/rateLimiter";
import { globalErrorHandler } from "./middleware/errorHandler";
import { env } from "./env";
import logger from "./utils/logger";
import messagingRoutes from "./routes/messagingRoutes";
import { createSocketServer } from "./socket/socketServer";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(helmet());
app.use(corsConfig);
app.use(globalRateLimitterMiddleware);

app.use((req, _res, next) => {
  logger.info(`Received ${req.method} ${req.url}`);
  next();
});

app.get("/api/messages/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Messaging service is running",
  });
});

app.use("/api/messages", messagingRoutes);
app.use(globalErrorHandler);

createSocketServer(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`Messaging service listening on port ${env.PORT}`);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", { error: error.message });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  process.exit(1);
});
