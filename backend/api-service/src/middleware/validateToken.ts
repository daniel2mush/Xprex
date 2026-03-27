import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger"; // adjust path as needed
import { sendJson } from "../utils/responseHelper";
import { env } from "../env";

// Recommended: Use a custom request type instead of inline {User:string}
export const validateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Get Authorization header
  const authHeader = req.headers.authorization; // lowercase is standard

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Authorization header missing or invalid format");
    sendJson(res, 401, false, "Authentication required. Please login.");
    return;
  }

  // 2. Extract token (safe split)
  const token = authHeader.split(" ")[1];

  if (!token) {
    logger.warn("No token provided in Bearer header");
    sendJson(res, 401, false, "Token required. Please login and continue.");
    return;
  }

  try {
    // 3. Verify token synchronously (preferred in middleware)
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    // 4. Attach user data to request (use lowercase 'user' – convention)
    const user = decoded as { userId: string; username: string };
    (req as any).user = user;

    // 5. Continue to next middleware/route
    next();
  } catch (err) {
    // Handle different JWT errors more gracefully
    if (err instanceof jwt.TokenExpiredError) {
      logger.warn("Access token expired");
      return sendJson(
        res,
        401,
        false,
        "Token has expired. Please login again.",
      );
    }

    if (err instanceof jwt.JsonWebTokenError) {
      logger.warn("Invalid JWT signature or malformed token");
      return sendJson(res, 401, false, "Invalid token.");
    }

    // Fallback for unexpected errors
    logger.error("JWT verification error", err);
    return sendJson(res, 401, false, "Authentication failed.");
  }
};
