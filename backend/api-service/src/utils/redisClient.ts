import Redis from "ioredis";
import logger from "./logger";

const redisClient = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { enableOfflineQueue: true }, // ioredis will queue commands if redis is temporarily down
);

redisClient.on("connect", () => {
  logger.info("Connected to Redis successfully");
});

redisClient.on("error", (err) => {
  logger.error("Redis connection error:", err);
});

export default redisClient;
