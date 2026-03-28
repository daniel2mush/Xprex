import { Request, Response } from "express";
import logger from "../utils/logger";
import { prisma } from "@social/db";
import {
  deleteAccountValidation,
  loginValdation,
  registrationValidation,
  updateAccountSecurityValidation,
  updateProfileValidation,
} from "../utils/validation";
import { sendJson } from "../utils/responseHelper";
import bcrypt from "bcrypt";
import { generateTokens } from "../utils/generateTokens";
import crypto from "crypto";

// ==========================================
// CONSTANTS
// ==========================================
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

// ==========================================
// HELPERS
// ==========================================

// Consistent user shape returned in every auth response
const selectPublicUser = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  headerPhoto: true,
  bio: true,
  location: true,
  isVerified: true,
  isAdmin: true,
  createdAt: true,
  _count: {
    select: {
      posts: true,
      followers: true,
      following: true,
    },
  },
} as const;

const storeRefreshToken = (userId: string, token: string) =>
  prisma.refreshToken.create({
    data: {
      hashedToken: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

// ==========================================
// REGISTRATION
// ==========================================
export const registration = async (req: Request, res: Response) => {
  logger.info("Registration endpoint hit");

  try {
    const validation = registrationValidation.safeParse(req.body);
    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message ?? "Invalid input";
      logger.warn("Registration validation failed", { error: errorMsg });
      return sendJson(res, 400, false, errorMsg);
    }

    const { email, username, password } = validation.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      logger.warn("Registration: duplicate credentials", { field });
      return sendJson(res, 409, false, `This ${field} is already taken`);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: { email, username, password: hashedPassword },
      select: selectPublicUser,
    });

    const { accessToken, refreshToken } = await generateTokens(newUser);
    await storeRefreshToken(newUser.id, refreshToken);

    logger.info("User registered successfully", { userId: newUser.id });

    return sendJson(res, 201, true, "User registered successfully", {
      accessToken,
      refreshToken,
      user: newUser,
    });
  } catch (error: any) {
    logger.error("Registration failed", { error: error.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// LOGIN
// ==========================================
export const login = async (req: Request, res: Response) => {
  try {
    const validation = loginValdation.safeParse(req.body);
    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message ?? "Invalid input";
      logger.warn("Login validation failed", { error: errorMsg });
      return sendJson(res, 400, false, errorMsg);
    }

    const { email, password } = validation.data;

    // Fetch password separately — never expose it in selectPublicUser
    const userWithPassword = await prisma.user.findUnique({
      where: { email },
      select: { ...selectPublicUser, password: true },
    });

    if (!userWithPassword) {
      logger.warn("Login: user not found", { email });
      return sendJson(res, 401, false, "Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      userWithPassword.password,
    );

    if (!isPasswordValid) {
      logger.warn("Login: wrong password", { email });
      return sendJson(res, 401, false, "Invalid credentials");
    }

    const { password: _pw, ...user } = userWithPassword;

    const { accessToken, refreshToken } = await generateTokens(user);
    await storeRefreshToken(user.id, refreshToken);

    logger.info("User logged in successfully", { userId: user.id });

    return sendJson(res, 200, true, "Login successful", {
      accessToken,
      refreshToken,
      user,
    });
  } catch (error: any) {
    logger.error("Login error", { error: error.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// REFRESH TOKEN
// ==========================================
export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken: clientToken } = req.body as { refreshToken?: string };

  if (!clientToken) {
    return sendJson(res, 400, false, "Refresh token required");
  }

  try {
    const storedToken = await prisma.refreshToken.findFirst({
      where: { hashedToken: hashToken(clientToken) },
      include: { user: { select: selectPublicUser } },
    });

    if (!storedToken) {
      logger.warn("Refresh: token not found");
      return sendJson(res, 401, false, "Invalid refresh token");
    }

    if (storedToken.expiresAt < new Date()) {
      logger.warn("Refresh: token expired", { tokenId: storedToken.id });
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return sendJson(res, 401, false, "Refresh token expired");
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.refreshToken.delete({ where: { id: storedToken.id } });

      const { accessToken, refreshToken: newRefreshToken } =
        await generateTokens(storedToken.user);

      await tx.refreshToken.create({
        data: {
          hashedToken: hashToken(newRefreshToken),
          userId: storedToken.user.id,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      });

      return { accessToken, refreshToken: newRefreshToken };
    });

    logger.info("Token refreshed", { userId: storedToken.user.id });

    return sendJson(res, 200, true, "Token refreshed successfully", {
      ...result,
      user: storedToken.user, // re-hydrate the frontend store
    });
  } catch (error: any) {
    logger.error("Refresh token error", { error: error.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// LOGOUT
// ==========================================
export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    return sendJson(res, 400, false, "Refresh token required for logout");
  }

  try {
    const deleted = await prisma.refreshToken.deleteMany({
      where: { hashedToken: hashToken(refreshToken) },
    });

    if (deleted.count === 0) {
      // Treat as success — token was already gone
      return sendJson(res, 200, true, "Already logged out");
    }

    logger.info("User logged out", { deletedCount: deleted.count });
    return sendJson(res, 200, true, "Logged out successfully");
  } catch (error: any) {
    logger.error("Logout error", { error: error.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// UPDATE PROFILE
// ==========================================
export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return sendJson(res, 401, false, "Authentication required");
  }

  try {
    const validation = updateProfileValidation.safeParse(req.body);

    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message ?? "Invalid input";
      logger.warn("Profile update validation failed", {
        userId,
        error: errorMsg,
      });
      return sendJson(res, 400, false, errorMsg);
    }

    const payload = validation.data;
    const username = payload.username?.trim();
    const bio = payload.bio?.trim();
    const location = payload.location?.trim();

    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (existingUser) {
        return sendJson(res, 409, false, "This username is already taken");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.username !== undefined && { username: username || undefined }),
        ...(payload.bio !== undefined && { bio: bio || null }),
        ...(payload.avatar !== undefined && { avatar: payload.avatar || null }),
        ...(payload.headerPhoto !== undefined && {
          headerPhoto: payload.headerPhoto || null,
        }),
        ...(payload.location !== undefined && { location: location || null }),
      },
      select: selectPublicUser,
    });

    logger.info("Profile updated successfully", { userId });
    return sendJson(
      res,
      200,
      true,
      "Profile updated successfully",
      updatedUser,
    );
  } catch (error: any) {
    logger.error("Profile update failed", { userId, error: error.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// UPDATE ACCOUNT SECURITY
// ==========================================
export const updateAccountSecurity = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return sendJson(res, 401, false, "Authentication required");
  }

  try {
    const validation = updateAccountSecurityValidation.safeParse(req.body);

    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message ?? "Invalid input";
      return sendJson(res, 400, false, errorMsg);
    }

    const { email, currentPassword, newPassword } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!existingUser) {
      return sendJson(res, 404, false, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      existingUser.password,
    );

    if (!isPasswordValid) {
      return sendJson(res, 401, false, "Current password is incorrect");
    }

    if (email && email !== existingUser.email) {
      const emailInUse = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (emailInUse) {
        return sendJson(res, 409, false, "This email is already in use");
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(email ? { email } : {}),
        ...(newPassword
          ? { password: await bcrypt.hash(newPassword, 12) }
          : {}),
      },
      select: selectPublicUser,
    });

    logger.info("Account security updated", { userId });
    return sendJson(res, 200, true, "Account updated successfully", updatedUser);
  } catch (error: any) {
    logger.error("Account security update failed", {
      userId,
      error: error.message,
    });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// DELETE ACCOUNT
// ==========================================
export const deleteAccount = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return sendJson(res, 401, false, "Authentication required");
  }

  try {
    const validation = deleteAccountValidation.safeParse(req.body);

    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message ?? "Invalid input";
      return sendJson(res, 400, false, errorMsg);
    }

    const { currentPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return sendJson(res, 404, false, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return sendJson(res, 401, false, "Current password is incorrect");
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info("Account deleted", { userId });
    return sendJson(res, 200, true, "Account deleted successfully");
  } catch (error: any) {
    logger.error("Account deletion failed", { userId, error: error.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};
