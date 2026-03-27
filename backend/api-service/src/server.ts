import "dotenv/config";
import express, { Request, Response } from "express";
import helmet from "helmet";
import proxy, { ProxyOptions } from "express-http-proxy";
import logger from "./utils/logger";
import { corsConfig } from "./config/corsConfig";
import { globslRateLimitterMiddleware } from "./middleware/rateLimiter";
import { globalErrorHandler } from "./middleware/errorHandler";
import { sendJson } from "./utils/responseHelper";
import { validateToken } from "./middleware/validateToken";
import { env } from "./env";

const app = express();

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(helmet());
app.use(corsConfig);
app.use(globslRateLimitterMiddleware);

app.use((req: Request, _res: Response, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// ==========================================
// PROXY CONFIG
// ==========================================
const baseProxyOptions = {
  proxyReqPathResolver: (req: Request) =>
    req.originalUrl.replace(/^\/v1/, "/api"),

  proxyErrorHandler: (err: any, res: any, _next: any) => {
    logger.error(`Proxy error: ${err.message}`);
    sendJson(res, 502, false, "Service unavailable");
  },
} satisfies ProxyOptions;

// Injects userId for authenticated routes
const withUserId = (proxyReqOptions: any, srcReq: Request) => {
  proxyReqOptions.headers["x-user-id"] = srcReq.user.userId;
  proxyReqOptions.headers["content-type"] = "application/json";
  return proxyReqOptions;
};

const logResponse =
  (serviceName: string) => (proxyRes: any, proxyResData: any) => {
    logger.info(`Response from ${serviceName}: ${proxyRes.statusCode}`);
    return proxyResData;
  };

// ==========================================
// AUTH SERVICE — no token required
// ==========================================
app.use(
  "/v1/auth",
  proxy(env.AUTH_SERVICE, {
    ...baseProxyOptions,
    proxyReqOptDecorator: (proxyReqOptions) => {
      proxyReqOptions.headers["content-type"] = "application/json";
      return proxyReqOptions;
    },
    userResDecorator: logResponse("auth-service"),
  }),
);

// ==========================================
// POST SERVICE
// ==========================================
app.use(
  "/v1/posts",
  validateToken,
  proxy(env.POST_SERVICE, {
    ...baseProxyOptions,
    proxyReqOptDecorator: withUserId,
    userResDecorator: logResponse("post-service"),
  }),
);

// ==========================================
// SEARCH SERVICE
// ==========================================
app.use(
  "/v1/search",
  validateToken,
  proxy(env.SEARCH_SERVICE, {
    ...baseProxyOptions,
    proxyReqOptDecorator: withUserId,
    userResDecorator: logResponse("search-service"),
  }),
);

// ==========================================
// MEDIA SERVICE
// ==========================================
app.use(
  "/v1/media",
  validateToken,
  proxy(env.MEDIA_SERVICE, {
    ...baseProxyOptions,
    parseReqBody: false, // must be false for multipart — don't let the gateway buffer it
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      proxyReqOptions.headers["x-user-id"] = srcReq.user.userId;

      // Only set JSON content-type for non-multipart requests
      // For file uploads the original content-type must pass through untouched
      const contentType = srcReq.headers["content-type"] ?? "";
      if (!contentType.startsWith("multipart/form-data")) {
        proxyReqOptions.headers["content-type"] = "application/json";
      }

      return proxyReqOptions;
    },
    userResDecorator: logResponse("media-service"),
  }),
);

//Comment Service
app.use(
  "/v1/comments",
  validateToken,
  proxy(env.COMMENT_SERVICE, {
    ...baseProxyOptions,
    proxyReqOptDecorator: withUserId,
    userResDecorator: logResponse("comment-service"),
  }),
);

//Notification Service
app.use(
  "/v1/notifications",
  validateToken,
  proxy(env.NOTIFICATION_SERVICE, {
    ...baseProxyOptions,
    proxyReqOptDecorator: withUserId,
    userResDecorator: logResponse("comment-service"),
  }),
);

// ==========================================
// ERROR HANDLER
// ==========================================
app.use(globalErrorHandler);

// ==========================================
// START
// ==========================================
app.listen(env.PORT, () => {
  logger.info(`API gateway running on port ${env.PORT}`);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  process.exit(1);
});
