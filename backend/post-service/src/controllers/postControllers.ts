import { Request, Response } from "express";
import logger from "../utils/logger";
import { prisma, Search } from "@social/db";
import { validatePost, type CreatePostInput } from "../utils/validation";
import { sendJson } from "../utils/responseHelper";
import { publishEvent } from "@social/rabbitmq";

// ==========================================
// CONSTANTS
// ==========================================
const POST_CACHE_TTL = 300; // 5 min for lists
const SINGLE_POST_TTL = 3600; // 1 hour for single post

// ==========================================
// TYPES
// ==========================================
interface PostCreatedEvent {
  postId: string;
  userId: string;
  content: string;
}

interface LikeCreatedEvent {
  likeId: string;
  postId: string;
  postOwnerId: string;
  likerId: string;
}

interface FollowCreatedEvent {
  followId: string;
  followerId: string;
  followingId: string;
}

// ==========================================
// HELPERS
// ==========================================
const invalidatePostCache = async (req: Request, postId?: string) => {
  try {
    const keys: string[] = [];

    if (postId) keys.push(`post:${postId}`);

    const listKeys = await req.redisClient.keys("posts:*");
    keys.push(...listKeys);

    if (keys.length > 0) {
      await req.redisClient.del(...keys);
      logger.info(`Cache invalidated (${keys.length} keys)`);
    }
  } catch (err) {
    logger.warn("Cache invalidation failed (non-blocking)", err);
  }
};

// Consistent post shape used in all read operations
const postInclude = (userId: string) => ({
  user: {
    select: {
      id: true,
      username: true,
      avatar: true,
      isVerified: true,
    },
  },
  media: {
    select: {
      id: true,
      url: true,
      type: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
    },
  },
  likes: {
    where: { userId },
    select: { id: true },
    take: 1,
  },
  bookmarks: {
    where: { userId },
    select: { id: true },
    take: 1,
  },
});

// Flatten isLiked / isBookmarked into booleans for the client
const normalizePost = (post: any) => ({
  ...post,
  isLiked: post.likes?.length > 0,
  isBookmarked: post.bookmarks?.length > 0,
  likes: undefined,
  bookmarks: undefined,
});

const profileUserSelect = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  headerPhoto: true,
  bio: true,
  location: true,
  isVerified: true,
  createdAt: true,
  _count: {
    select: {
      posts: true,
      followers: true,
      following: true,
    },
  },
} as const;

const connectionUserSelect = {
  id: true,
  username: true,
  avatar: true,
  headerPhoto: true,
  bio: true,
  location: true,
  isVerified: true,
  createdAt: true,
  _count: {
    select: {
      followers: true,
      following: true,
      posts: true,
    },
  },
} as const;

// ==========================================
// CREATE POST
// ==========================================
export const CreatePost = async (req: Request, res: Response) => {
  const { data, error } = validatePost(req.body);

  try {
    if (error) {
      const msg = error.issues[0]?.message ?? "Validation failed";
      logger.warn("Post validation failed", { msg });
      return sendJson(res, 400, false, `Validation error: ${msg}`);
    }

    const { content, mediaUrls } = data as CreatePostInput;

    const createdPost = await prisma.post.create({
      data: {
        content,
        userId: req.user.userId,
        ...(mediaUrls?.length && {
          media: {
            // Connect existing Media records by URL instead of creating new ones
            connect: await prisma.media
              .findMany({
                where: {
                  url: { in: mediaUrls },
                  userId: req.user.userId, // ensure they belong to this user
                  postId: null, // ensure they aren't already attached to another post
                },
                select: { id: true },
              })
              .then((records) => records.map((r) => ({ id: r.id }))),
          },
        }),
      },
      include: postInclude(req.user.userId),
    });

    await invalidatePostCache(req);

    publishEvent("social:post-created", {
      postId: createdPost.id,
      userId: createdPost.userId,
      query: createdPost.content,
    } as Search);

    logger.info(`Post created`, { postId: createdPost.id });
    return sendJson(
      res,
      201,
      true,
      "Post created successfully",
      normalizePost(createdPost),
    );
  } catch (err: any) {
    logger.error("Failed to create post", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET ALL POSTS
// ==========================================
export const GetAllPosts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    const cacheKey = `posts:${req.user.userId}:${page}:${limit}`;

    // Cache key is per-user because isLiked/isBookmarked are user-specific
    const cached = await req.redisClient.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit → ${cacheKey}`);
      return sendJson(
        res,
        200,
        true,
        "Posts retrieved successfully",
        JSON.parse(cached),
      );
    }

    const [rawPosts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: postInclude(req.user.userId!),
      }),
      prisma.post.count(),
    ]);

    const posts = rawPosts.map(normalizePost);

    const responseData = {
      posts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        hasMore: page * limit < totalPosts,
      },
    };

    await req.redisClient.set(
      cacheKey,
      JSON.stringify(responseData),
      "EX",
      POST_CACHE_TTL,
    );

    return sendJson(
      res,
      200,
      true,
      "Posts retrieved successfully",
      responseData,
    );
  } catch (err: any) {
    logger.error("Failed to fetch posts", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET SINGLE POST
// ==========================================
export const GetSinglePost = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  if (!postId) return sendJson(res, 400, false, "Post ID is required");

  if (!postId || Array.isArray(postId)) {
    return sendJson(res, 400, false, "Invalid post ID");
  }

  // postId is now guaranteed string — Prisma is happy
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    const cacheKey = `post:${req.user.userId}:${postId}`;

    const cached = await req.redisClient.get(cacheKey);
    if (cached) {
      return sendJson(
        res,
        200,
        true,
        "Post retrieved successfully",
        JSON.parse(cached),
      );
    }

    const raw = await prisma.post.findUnique({
      where: { id: postId },
      include: postInclude(req.user.userId!),
    });

    if (!raw) return sendJson(res, 404, false, "Post not found");

    const post = normalizePost(raw);

    await req.redisClient.set(
      cacheKey,
      JSON.stringify(post),
      "EX",
      SINGLE_POST_TTL,
    );

    return sendJson(res, 200, true, "Post retrieved successfully", post);
  } catch (err: any) {
    logger.error("Failed to fetch post", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET USER PROFILE
// ==========================================
export const GetUserProfile = async (req: Request, res: Response) => {
  const { userId: profileId } = req.params;
  const viewerId = req.user.userId;

  if (!profileId) return sendJson(res, 400, false, "User ID is required");
  if (Array.isArray(profileId)) {
    return sendJson(res, 400, false, "Invalid user ID");
  }

  try {
    const [user, rawPosts, likedEntries, replies, isFollowing, followsYou] =
      await Promise.all([
      prisma.user.findUnique({
        where: { id: profileId },
        select: profileUserSelect,
      }),
        prisma.post.findMany({
          where: { userId: profileId },
          orderBy: { createdAt: "desc" },
          include: postInclude(viewerId!),
        }),
        prisma.like.findMany({
          where: { userId: profileId },
          orderBy: { createdAt: "desc" },
          include: {
            post: {
              include: postInclude(viewerId!),
            },
          },
        }),
        prisma.comment.findMany({
          where: {
            userId: profileId,
            parentId: { not: null },
          },
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isVerified: true,
              },
            },
            post: {
              select: {
                id: true,
                content: true,
                createdAt: true,
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
          },
        }),
        profileId === viewerId
          ? Promise.resolve(false)
          : prisma.follow
              .findUnique({
                where: {
                  followerId_followingId: {
                    followerId: viewerId,
                    followingId: profileId,
                  },
                },
                select: { id: true },
              })
              .then((follow) => Boolean(follow)),
        profileId === viewerId
          ? Promise.resolve(false)
          : prisma.follow
              .findUnique({
                where: {
                  followerId_followingId: {
                    followerId: profileId,
                    followingId: viewerId,
                  },
                },
                select: { id: true },
              })
              .then((follow) => Boolean(follow)),
      ]);

    if (!user) return sendJson(res, 404, false, "User not found");

    return sendJson(res, 200, true, "Profile retrieved successfully", {
      user: {
        ...user,
        isFollowing,
        followsYou,
      },
      posts: rawPosts.map(normalizePost),
      likedPosts: likedEntries.map((entry) => normalizePost(entry.post)),
      replies,
    });
  } catch (err: any) {
    logger.error("Failed to fetch profile", { error: err.message, profileId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET USER CONNECTIONS
// ==========================================
export const GetUserConnections = async (req: Request, res: Response) => {
  const { userId: profileId } = req.params;
  const viewerId = req.user.userId;
  const type = req.query.type === "following" ? "following" : "followers";

  if (!profileId) return sendJson(res, 400, false, "User ID is required");
  if (Array.isArray(profileId)) {
    return sendJson(res, 400, false, "Invalid user ID");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    if (!user) return sendJson(res, 404, false, "User not found");

    const connections = await prisma.follow.findMany({
      where:
        type === "followers"
          ? { followingId: profileId }
          : { followerId: profileId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        follower: {
          select: connectionUserSelect,
        },
        following: {
          select: connectionUserSelect,
        },
      },
    });

    const mappedUsers = connections.map((connection) =>
      type === "followers"
        ? {
            ...connection.follower,
            connectedAt: connection.createdAt,
          }
        : {
            ...connection.following,
            connectedAt: connection.createdAt,
          },
    );

    const connectionIds = mappedUsers.map((connection) => connection.id);

    const viewerLinks =
      connectionIds.length === 0
        ? []
        : await prisma.follow.findMany({
            where: {
              OR: [
                {
                  followerId: viewerId,
                  followingId: { in: connectionIds },
                },
                {
                  followerId: { in: connectionIds },
                  followingId: viewerId,
                },
              ],
            },
            select: {
              followerId: true,
              followingId: true,
            },
          });

    const mappedViewerLinks = new Set(
      viewerLinks.map((link) => `${link.followerId}:${link.followingId}`),
    );

    return sendJson(res, 200, true, "Connections retrieved successfully", {
      type,
      users: mappedUsers.map((connection) => {
        const isFollowing = mappedViewerLinks.has(
          `${viewerId}:${connection.id}`,
        );
        const followsYou = mappedViewerLinks.has(
          `${connection.id}:${viewerId}`,
        );

        return {
          ...connection,
          isFollowing,
          followsYou,
          canMessage:
            connection.id !== viewerId && (isFollowing || followsYou),
        };
      }),
    });
  } catch (err: any) {
    logger.error("Failed to fetch connections", {
      error: err.message,
      profileId,
      type,
    });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// TOGGLE FOLLOW
// ==========================================
export const ToggleFollowUser = async (req: Request, res: Response) => {
  const viewerId = req.user.userId;
  const { userId: targetUserId } = req.params;

  if (!targetUserId) return sendJson(res, 400, false, "User ID is required");
  if (Array.isArray(targetUserId)) {
    return sendJson(res, 400, false, "Invalid user ID");
  }
  if (viewerId === targetUserId) {
    return sendJson(res, 400, false, "You cannot follow yourself");
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) return sendJson(res, 404, false, "User not found");

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: targetUserId,
        },
      },
      select: { id: true },
    });

    let following = false;

    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
    } else {
      const follow = await prisma.follow.create({
        data: {
          followerId: viewerId,
          followingId: targetUserId,
        },
      });

      following = true;

      publishEvent("social:follow-created", {
        followId: follow.id,
        followerId: viewerId,
        followingId: targetUserId,
      } as FollowCreatedEvent);
    }

    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    return sendJson(
      res,
      200,
      true,
      following ? "User followed successfully" : "User unfollowed successfully",
      {
        targetUserId,
        following,
        followersCount,
      },
    );
  } catch (err: any) {
    logger.error("Failed to toggle follow", {
      error: err.message,
      viewerId,
      targetUserId,
    });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// TOGGLE POST LIKE
// ==========================================
export const TogglePostLike = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  if (!postId) return sendJson(res, 400, false, "Post ID is required");
  if (Array.isArray(postId)) {
    return sendJson(res, 400, false, "Invalid post ID");
  }
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) return sendJson(res, 404, false, "Post not found");

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    let liked = false;

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
    } else {
      const like = await prisma.like.create({
        data: {
          userId,
          postId,
        },
      });

      liked = true;

      publishEvent("social:like-created", {
        likeId: like.id,
        postId,
        postOwnerId: post.userId,
        likerId: userId,
      } as LikeCreatedEvent);
    }

    const likesCount = await prisma.like.count({
      where: { postId },
    });

    await invalidatePostCache(req, postId);

    return sendJson(
      res,
      200,
      true,
      liked ? "Post liked successfully" : "Post unliked successfully",
      {
        postId,
        liked,
        likesCount,
      },
    );
  } catch (err: any) {
    logger.error("Failed to toggle like", { error: err.message, postId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// UPDATE POST
// ==========================================
export const UpdatePost = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  const { content } = req.body as { content?: string };

  if (!postId) return sendJson(res, 400, false, "Post ID is required");
  if (!content?.trim())
    return sendJson(res, 400, false, "Content cannot be empty");

  if (!postId || Array.isArray(postId)) {
    return sendJson(res, 400, false, "Invalid post ID");
  }

  // postId is now guaranteed string — Prisma is happy
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    // updateMany with userId in where = ownership check + update in one query
    const result = await prisma.post.updateMany({
      where: { id: postId, userId: req.user.userId! },
      data: { content: content.trim() },
    });

    if (result.count === 0) {
      // Either not found or not owned — return same message to avoid enumeration
      return sendJson(res, 403, false, "Post not found or unauthorized");
    }

    await invalidatePostCache(req, postId);

    logger.info(`Post updated`, { postId });
    return sendJson(res, 200, true, "Post updated successfully");
  } catch (err: any) {
    logger.error("Failed to update post", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// DELETE POST
// ==========================================
export const DeletePost = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  if (!postId) return sendJson(res, 400, false, "Post ID is required");
  if (!postId || Array.isArray(postId)) {
    return sendJson(res, 400, false, "Invalid post ID");
  }

  // postId is now guaranteed string — Prisma is happy
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    const result = await prisma.post.deleteMany({
      where: { id: postId, userId: req.user.userId! },
    });

    if (result.count === 0) {
      return sendJson(res, 403, false, "Post not found or unauthorized");
    }

    await invalidatePostCache(req, postId);

    logger.info(`Post deleted`, { postId });
    return sendJson(res, 200, true, "Post deleted successfully");
  } catch (err: any) {
    logger.error("Failed to delete post", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};
