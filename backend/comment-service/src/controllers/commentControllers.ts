import { Request, Response } from "express";
import { prisma } from "@social/db";
import { publishEvent } from "@social/rabbitmq";
import { sendJson } from "../utils/responseHelper";
import { validateComment, CreateCommentInput } from "../utils/validation";
import logger from "../utils/logger";

// Consistent comment shape for all responses
const commentInclude = (userId: string) => ({
  user: {
    select: {
      id: true,
      username: true,
      avatar: true,
      isVerified: true,
    },
  },
  _count: {
    select: { replies: true },
  },
  replies: {
    take: 3, // preview — client fetches full replies separately
    orderBy: { createdAt: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          isVerified: true,
        },
      },
    },
  },
});

// ==========================================
// CREATE COMMENT
// ==========================================
export const createComment = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  const { id: postId } = req.params;
  if (!postId || Array.isArray(postId)) {
    return sendJson(res, 400, false, "Invalid post ID");
  }

  const { data, error } = validateComment(req.body);
  if (error) {
    return sendJson(
      res,
      400,
      false,
      error.issues[0]?.message ?? "Invalid input",
    );
  }

  const { content, parentId } = data as CreateCommentInput;

  try {
    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) return sendJson(res, 404, false, "Post not found");

    // If replying, verify parent comment exists and belongs to same post
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true },
      });

      if (!parent || parent.postId !== postId) {
        return sendJson(res, 400, false, "Invalid parent comment");
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        postId,
        parentId: parentId ?? null,
      },
      include: commentInclude(userId),
    });

    // Publish event for notification-service
    publishEvent("social:comment-created", {
      commentId: comment.id,
      postId,
      postOwnerId: post.userId,
      commenterId: userId,
      parentId: parentId ?? null,
      content,
    }).catch((err) => logger.warn("Failed to publish comment event", err));

    logger.info("Comment created", { commentId: comment.id, postId, userId });
    return sendJson(res, 201, true, "Comment created", comment);
  } catch (err: any) {
    logger.error("Failed to create comment", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET COMMENTS FOR POST
// ==========================================
export const getComments = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  const { id: postId } = req.params;
  if (!postId || Array.isArray(postId)) {
    return sendJson(res, 400, false, "Invalid post ID");
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, parentId: null }, // top-level only
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: commentInclude(userId),
      }),
      prisma.comment.count({
        where: { postId, parentId: null },
      }),
    ]);

    return sendJson(res, 200, true, "Comments retrieved", {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err: any) {
    logger.error("Failed to get comments", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET REPLIES FOR COMMENT
// ==========================================
export const getReplies = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  const { id: commentId } = req.params;
  if (!commentId || Array.isArray(commentId)) {
    return sendJson(res, 400, false, "Invalid comment ID");
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      prisma.comment.findMany({
        where: { parentId: commentId },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
      }),
      prisma.comment.count({ where: { parentId: commentId } }),
    ]);

    return sendJson(res, 200, true, "Replies retrieved", {
      replies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err: any) {
    logger.error("Failed to get replies", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// DELETE COMMENT
// ==========================================
export const deleteComment = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  const { id: commentId } = req.params;
  if (!commentId || Array.isArray(commentId)) {
    return sendJson(res, 400, false, "Invalid comment ID");
  }

  try {
    // deleteMany with userId = ownership check + delete in one query
    const result = await prisma.comment.deleteMany({
      where: { id: commentId, userId },
    });

    if (result.count === 0) {
      return sendJson(res, 403, false, "Comment not found or unauthorized");
    }

    logger.info("Comment deleted", { commentId, userId });
    return sendJson(res, 200, true, "Comment deleted");
  } catch (err: any) {
    logger.error("Failed to delete comment", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};
