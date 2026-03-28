import jwt from "jsonwebtoken";
import { env } from "../env";
import crypto from "crypto";

interface TokenPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
}

interface GeneratedTokens {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (
  user: { id: string; username: string; isAdmin?: boolean },
): GeneratedTokens => {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    isAdmin: Boolean(user.isAdmin),
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "60m",
  });

  // Cryptographically random — never stored directly, caller hashes before persisting
  const refreshToken = crypto.randomBytes(40).toString("hex");

  return { accessToken, refreshToken };
};
