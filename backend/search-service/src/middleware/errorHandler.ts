import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";
export const globalErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error(error.stack);
  res.status(500).json({
    message: error.message || "Internal server error",
  });
};
