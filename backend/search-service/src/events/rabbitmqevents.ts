import { prisma, Search } from "@social/db";
import logger from "../utils/logger";
import { getRedisClient, RedisClient } from "@social/redis-client";

export const handlePostCreation = async (events: Search) => {
  const RedisClient = await getRedisClient();
  try {
    await prisma.search.create({
      data: events,
    });

    RedisClient.incr("search_version");
    logger.info("Search post created successfully");
  } catch (error) {
    logger.error("Error created Searched post");
  }
};
