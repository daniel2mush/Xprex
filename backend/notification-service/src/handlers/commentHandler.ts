import { prisma } from "@social/db";
import { CommentCreatedEvent } from "../types/events";
import logger from "../utils/logger";

export const handleCommentCreated = async (event: CommentCreatedEvent) => {
  const { commentId, postId, postOwnerId, commenterId, parentId } = event;

  // Don't notify if user comments on their own post
  if (postOwnerId === commenterId) return;

  try {
    if (parentId) {
      // This is a reply — notify the parent comment owner instead
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentComment && parentComment.userId !== commenterId) {
        await prisma.notification.create({
          data: {
            type: "REPLY",
            userId: parentComment.userId, // who gets notified
            actorId: commenterId, // who triggered it
            postId,
            commentId,
          },
        });
        logger.info("Reply notification created", { commentId });
      }
    } else {
      // Top-level comment — notify post owner
      await prisma.notification.create({
        data: {
          type: "COMMENT",
          userId: postOwnerId,
          actorId: commenterId,
          postId,
          commentId,
        },
      });
      logger.info("Comment notification created", { commentId });
    }
  } catch (err: any) {
    logger.error("Failed to create comment notification", {
      error: err.message,
    });
    throw err; // rethrow so RabbitMQ nacks and retries
  }
};
