import { prisma } from "@social/db";
import { FollowCreatedEvent } from "../types/events";
import logger from "../utils/logger";

export const handleFollowCreated = async (event: FollowCreatedEvent) => {
  const { followerId, followingId } = event;

  try {
    await prisma.notification.create({
      data: {
        type: "FOLLOW",
        userId: followingId, // the person being followed gets notified
        actorId: followerId,
      },
    });
    logger.info("Follow notification created", { followerId, followingId });
  } catch (err: any) {
    logger.error("Failed to create follow notification", {
      error: err.message,
    });
    throw err;
  }
};
