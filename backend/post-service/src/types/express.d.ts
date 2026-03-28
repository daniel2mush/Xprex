import { Redis } from "ioredis";

declare global {
  namespace Express {
    interface Request {
      user: {
        userId: string;
        username: string;
        isAdmin: boolean;
      };
      redisClient: Redis;
    }
  }
}

export {};
