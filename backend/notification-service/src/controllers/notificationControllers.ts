import { prisma } from "@social/db";
import logger from "../utils/logger";
import { sendJson } from "../utils/responseHelper";
import { Request, Response } from "express";

export const getNotifications = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, username: true, handle: true, avatar: true } },
        post: { select: { id: true, content: true } },
        comment: { select: { id: true, content: true } },
      },
    });

    return sendJson(res, 200, true, "Notifications retrieved", notifications);
  } catch (err: any) {
    logger.error("Failed to fetch notifications", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return sendJson(res, 200, true, "Marked all as read");
  } catch (err: any) {
    logger.error("Failed to mark notifications as read", {
      error: err.message,
    });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) return sendJson(res, 401, false, "Unauthorized");
  if (!id || Array.isArray(id)) {
    return sendJson(res, 400, false, "Invalid notification ID");
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        id,
        userId,
        read: false,
      },
      data: { read: true },
    });

    if (result.count === 0) {
      return sendJson(res, 200, true, "Notification already read");
    }

    return sendJson(res, 200, true, "Notification marked as read");
  } catch (err: any) {
    logger.error("Failed to mark notification as read", {
      error: err.message,
      notificationId: id,
    });
    return sendJson(res, 500, false, "Internal server error");
  }
};
