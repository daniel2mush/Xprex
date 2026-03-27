import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

export const globalErrorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error("Unhandled messaging-service error", { error: error.message });
  res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
};
