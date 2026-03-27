declare global {
  namespace Express {
    interface Request {
      redisClient: Awaited<ReturnType<typeof getRedisClient>>;
    }
  }
}

export {};
