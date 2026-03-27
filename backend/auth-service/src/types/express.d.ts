declare global {
  namespace Express {
    interface Request {
      redisClient: Awaited<ReturnType<typeof getRedisClient>>;
      user: {
        userId: string;
        username: string;
      };
    }
  }
}

export {};
