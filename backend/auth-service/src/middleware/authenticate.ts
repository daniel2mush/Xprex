import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

export const authenticateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.headers["x-user-id"];
  const isAdminHeader = req.headers["x-user-is-admin"];

  if (!userId || Array.isArray(userId)) {
    logger.warn("Auth-service protected route hit without user ID", {
      url: req.url,
    });

    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  req.user = {
    userId,
    username: "",
    isAdmin: !Array.isArray(isAdminHeader) && isAdminHeader === "true",
  };
  next();
};
