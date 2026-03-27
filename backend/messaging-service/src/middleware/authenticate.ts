import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

export const authenticateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.headers["x-user-id"];

  if (!userId || Array.isArray(userId)) {
    logger.warn("Messaging access attempted without user ID", { url: req.url });
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  req.user = { userId, username: "" };
  next();
};
