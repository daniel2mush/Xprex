import { prisma } from "@social/db";
import { MessageCreatedEvent } from "../types/events";
import logger from "../utils/logger";

export const handleMessageCreated = async (event: MessageCreatedEvent) => {
  const { senderId, recipientId, messageId } = event;

  if (senderId === recipientId) return;

  try {
    await prisma.notification.create({
      data: {
        type: "MESSAGE",
        userId: recipientId,
        actorId: senderId,
      },
    });

    logger.info("Message notification created", { messageId, recipientId });
  } catch (err: any) {
    logger.error("Failed to create message notification", {
      error: err.message,
      messageId,
    });
    throw err;
  }
};
