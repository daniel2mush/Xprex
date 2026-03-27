import { Request, Response } from "express";
import { prisma } from "@social/db";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";
import { sendJson } from "../utils/responseHelper";
import logger from "../utils/logger";

// ==========================================
// UPLOAD MEDIA
// ==========================================
export const uploadMedia = async (req: Request, res: Response) => {
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return sendJson(res, 400, false, "No files provided");
  }

  try {
    // Upload all files to Cloudinary in parallel
    const uploadResults = await Promise.all(
      files.map((file) => uploadToCloudinary(file.buffer, file.mimetype)),
    );

    // Persist Media records to DB
    const mediaRecords = await prisma.$transaction(
      uploadResults.map((result) =>
        prisma.media.create({
          data: {
            url: result.url,
            type: result.type,
            width: result.width,
            height: result.height,
            size: result.size,
            userId,
          },
          select: {
            id: true,
            url: true,
            type: true,
            width: true,
            height: true,
          },
        }),
      ),
    );

    logger.info(`Media uploaded`, { userId, count: mediaRecords.length });

    return sendJson(res, 201, true, "Media uploaded successfully", {
      media: mediaRecords,
      // Frontend passes these URLs to post-service when creating a post
      urls: mediaRecords.map((m) => m.url),
    });
  } catch (err: any) {
    logger.error("Media upload failed", { error: err.message });
    return sendJson(res, 500, false, "Upload failed");
  }
};

// ==========================================
// DELETE MEDIA
// ==========================================
export const deleteMedia = async (req: Request, res: Response) => {
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  const { id: mediaId } = req.params;
  if (!mediaId || Array.isArray(mediaId)) {
    return sendJson(res, 400, false, "Invalid media ID");
  }

  try {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      select: { id: true, url: true, type: true, userId: true, postId: true },
    });

    if (!media) return sendJson(res, 404, false, "Media not found");

    if (media.userId !== userId) {
      return sendJson(res, 403, false, "Unauthorized");
    }

    // Can't delete media that's already attached to a published post
    if (media.postId) {
      return sendJson(
        res,
        400,
        false,
        "Cannot delete media attached to a post",
      );
    }

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{folder}/{publicId}.{ext}
    const urlParts = media.url.split("/");
    const fileWithExt = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    const publicId = `${folder}/${fileWithExt.split(".")[0]}`;
    const isVideo = media.type === "VIDEO";

    await Promise.all([
      deleteFromCloudinary(publicId, isVideo),
      prisma.media.delete({ where: { id: mediaId } }),
    ]);

    logger.info(`Media deleted`, { mediaId, userId });
    return sendJson(res, 200, true, "Media deleted successfully");
  } catch (err: any) {
    logger.error("Media deletion failed", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET USER MEDIA
// ==========================================
export const getUserMedia = async (req: Request, res: Response) => {
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const skip = (page - 1) * limit;

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where: { userId, postId: { not: null } }, // only attached media
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: {
          id: true,
          url: true,
          type: true,
          width: true,
          height: true,
          postId: true,
        },
      }),
      prisma.media.count({ where: { userId, postId: { not: null } } }),
    ]);

    return sendJson(res, 200, true, "Media retrieved", {
      media,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err: any) {
    logger.error("Failed to fetch user media", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};
