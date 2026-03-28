import { Request, Response } from "express";
import {
  getConversationMessages,
  listConversations,
  markConversationRead,
} from "../store/messageStore";

export const getMessagingStatus = (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Messaging service is ready",
    data: {
      transport: "socket.io",
      namespace: "/messages",
    },
  });
};

export const getConversations = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  return res.status(200).json({
    success: true,
    data: await listConversations(userId),
  });
};

export const getConversationById = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid conversation ID",
    });
  }

  const conversation = await getConversationMessages(userId, id);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: "Conversation not found",
    });
  }

  await markConversationRead(userId, id);

  return res.status(200).json({
    success: true,
    data: {
      ...conversation,
      unreadCount: 0,
    },
  });
};
