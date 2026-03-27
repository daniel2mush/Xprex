import { prisma } from "@social/db";
import { LikeCreatedEvent } from "../types/events";
import logger from "../utils/logger";

export const handleLikeCreated = async (event: LikeCreatedEvent) => {
  const { postId, postOwnerId, likerId } = event;

  if (postOwnerId === likerId) return;

  try {
    await prisma.notification.create({
      data: {
        type: "LIKE",
        userId: postOwnerId,
        actorId: likerId,
        postId,
      },
    });
    logger.info("Like notification created", { postId, likerId });
  } catch (err: any) {
    logger.error("Failed to create like notification", { error: err.message });
    throw err;
  }
};
