import { prisma } from "@social/db";
import { RepostCreatedEvent } from "../types/events";
import logger from "../utils/logger";

export const handleRepostCreated = async (event: RepostCreatedEvent) => {
  const { postId, postOwnerId, repostedById } = event;

  if (postOwnerId === repostedById) return;

  try {
    await prisma.notification.create({
      data: {
        type: "REPOST",
        userId: postOwnerId,
        actorId: repostedById,
        postId,
      },
    });

    logger.info("Repost notification created", { postId, repostedById });
  } catch (err: any) {
    logger.error("Failed to create repost notification", {
      error: err.message,
    });
    throw err;
  }
};
