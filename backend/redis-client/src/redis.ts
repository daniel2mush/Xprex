import Redis, { Redis as RedisClient } from "ioredis";
import logger from "./logger"; // or your winston/logger import

let client: RedisClient | null = null;

export async function getRedisClient(): Promise<RedisClient> {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  // ioredis options - customize as needed
  client = new Redis(redisUrl, {
    // Recommended production defaults
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000), // exponential backoff
    enableOfflineQueue: true, // queue commands when disconnected
    connectTimeout: 10000,
    lazyConnect: false, // connect eagerly
    // tls: process.env.NODE_ENV === 'production' ? { ... } : undefined,
    // password: process.env.REDIS_PASSWORD,
    // db: 0,
  });

  // Event handlers (shared logging)
  client.on("connect", () => logger.info("[Redis] Connected successfully"));
  client.on("ready", () => logger.info("[Redis] Ready to use"));
  client.on("error", (err) => logger.error("[Redis] Client error", err));
  client.on("reconnecting", (delay: any) =>
    logger.warn(`[Redis] Reconnecting in ${delay}ms`),
  );
  client.on("close", () => logger.warn("[Redis] Connection closed"));
  client.on("end", () => {
    logger.warn("[Redis] Connection ended — will recreate on next use");
    client = null;
  });

  // Optional: wait for ready state
  await client.ping(); // throws if can't connect

  return client;
}

// Convenience wrappers (optional but clean)
export async function set(
  key: string,
  value: string | number | object,
  ttlSeconds?: number,
) {
  const redis = await getRedisClient();
  const strValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (ttlSeconds) {
    return redis.set(key, strValue, "EX", ttlSeconds);
  }
  return redis.set(key, strValue);
}

export async function get<T = string>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

export async function del(key: string | string[]) {
  const redis = await getRedisClient();
  return redis.del(key as string);
}

// Add more: incr, hset, pipeline(), etc. as needed
