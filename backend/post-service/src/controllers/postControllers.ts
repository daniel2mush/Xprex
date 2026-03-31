import { Request, Response } from "express";
import logger from "../utils/logger";
import { prisma, Search, Prisma } from "@social/db";
import { validatePost, type CreatePostInput } from "../utils/validation";
import { sendJson } from "../utils/responseHelper";
import { publishEvent } from "@social/rabbitmq";
import {
  isReportReason,
  isReportStatus,
  normalizeReportDetails,
} from "../utils/reporting";
import { FollowCreatedEvent, LikeCreatedEvent, PostCreatedEvent, RepostCreatedEvent, feedUserSelect } from "../types/Types";
import { postInclude, invalidatePostCache, normalizePost, getHiddenFeedUserIds, parsePage, parseLimit, sortFeedEvents, buildPagination, resolveProfileUser, hasBlockingRelationship, profileUserSelect, connectionUserSelect, getBlockedUserIds } from "../helpers/postHelpers";

// ==========================================
// CONSTANTS
// ==========================================
const POST_CACHE_TTL = 300; // 5 min for lists
const SINGLE_POST_TTL = 3600; // 1 hour for single post


// ==========================================
// CREATE POST
// ==========================================
export const CreatePost = async (req: Request, res: Response) => {
  const { data, error } = validatePost(req.body);

  if (error) {
    const msg = error.issues[0]?.message ?? "Validation failed";
    logger.warn("Post validation failed", { msg });
    return sendJson(res, 400, false, `Validation error: ${msg}`);
  }

  // Assuming frontend was updated to send mediaUrls instead of mediaUrls
  const { content, mediaUrls } = data as CreatePostInput
  const userId = req.user.userId;

  try {
    // 1. Explicitly validate media URLs to prevent IDOR and silent failures
    if (mediaUrls?.length) {
      const validMediaCount = await prisma.media.count({
        where: {
          url: { in: mediaUrls },
          userId: userId, 
          postId: null,   
        },
      });

      if (validMediaCount !== mediaUrls.length) {
        return sendJson(res, 400, false, "One or more media items are invalid, already used, or do not belong to you.");
      }
    }

    // 2. Create the post
    const createdPost = await prisma.post.create({
      data: {
        content,
        userId,
        ...(mediaUrls?.length && {
          media: {
            connect: mediaUrls.map((id) => ({ id })),
          },
        }),
      },
      include: postInclude(userId),
    });

    await invalidatePostCache(req);

    publishEvent("social:post-created", {
      postId: createdPost.id,
      userId: createdPost.userId,
      query: createdPost.content,
    } as Search);

    logger.info(`Post created`, { postId: createdPost.id });
    return sendJson(res, 201, true, "Post created successfully", normalizePost(createdPost));
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
    const userId = req.user.userId;
    const hiddenUserIds = Array.from(await getHiddenFeedUserIds(userId));
    
    const postVisibilityWhere = hiddenUserIds.length ? { userId: { notIn: hiddenUserIds } } : undefined;
    const repostVisibilityWhere = hiddenUserIds.length ? {
      AND: [
        { userId: { notIn: hiddenUserIds } },
        { post: { userId: { notIn: hiddenUserIds } } },
      ],
    } : undefined;

    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit, 50, 10);
    const skip = (page - 1) * limit;

    const cacheKey = `posts:${userId}:${page}:${limit}`;
    const cached = await req.redisClient.get(cacheKey);

    if (cached) {
      logger.info(`Cache hit → ${cacheKey}`);
      return sendJson(res, 200, true, "Posts retrieved successfully", JSON.parse(cached));
    }

    // Bounded fetch: Fetching 'limit' amount from both tables allows us to merge safely 
    // without pulling thousands of records into memory as the user scrolls deep.
    const [rawPosts, rawReposts, totalPosts, totalReposts] = await Promise.all([
      prisma.post.findMany({
        take: limit,
        skip,
        where: postVisibilityWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: postInclude(userId!),
      }),
      prisma.repost.findMany({
        take: limit,
        skip,
        where: repostVisibilityWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: { select: feedUserSelect },
          post: { include: postInclude(userId!) },
        },
      }),
      prisma.post.count({ where: postVisibilityWhere }),
      prisma.repost.count({ where: repostVisibilityWhere }),
    ]);

    const feedEvents = [
      ...rawPosts.map((post) => normalizePost(post, { feedEventId: `post:${post.id}`, feedCreatedAt: post.createdAt })),
      ...rawReposts.map((repost) => normalizePost(repost.post, {
        feedEventId: `repost:${repost.id}`,
        feedCreatedAt: repost.createdAt,
        repostedAt: repost.createdAt,
        repostedBy: repost.user,
      })),
    ]
      .sort(sortFeedEvents)
      .slice(0, limit); // Slice down to the requested limit after merging

    const responseData = {
      posts: feedEvents,
      pagination: buildPagination(page, limit, totalPosts + totalReposts),
    };

    await req.redisClient.set(cacheKey, JSON.stringify(responseData), "EX", POST_CACHE_TTL);

    return sendJson(res, 200, true, "Posts retrieved successfully", responseData);
  } catch (err: any) {
    logger.error("Failed to fetch posts", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET BOOKMARKED POSTS
// ==========================================
export const GetBookmarkedPosts = async (req: Request, res: Response) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit, 50, 10);
    const skip = (page - 1) * limit;
    const userId = req.user.userId;

    const cacheKey = `posts:bookmarks:${userId}:${page}:${limit}`;
    const cached = await req.redisClient.get(cacheKey);

    if (cached) {
      logger.info(`Cache hit → ${cacheKey}`);
      return sendJson(res, 200, true, "Bookmarked posts retrieved successfully", JSON.parse(cached));
    }

    const [bookmarkEntries, totalBookmarks] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: { post: { include: postInclude(userId) } },
      }),
      prisma.bookmark.count({ where: { userId } }),
    ]);

    const responseData = {
      posts: bookmarkEntries.map((entry) => normalizePost(entry.post)),
      pagination: buildPagination(page, limit, totalBookmarks),
    };

    await req.redisClient.set(cacheKey, JSON.stringify(responseData), "EX", POST_CACHE_TTL);

    return sendJson(res, 200, true, "Bookmarked posts retrieved successfully", responseData);
  } catch (err: any) {
    logger.error("Failed to fetch bookmarked posts", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET SINGLE POST
// ==========================================
export const GetSinglePost = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  if (typeof postId !== "string" || !postId) {
    return sendJson(res, 400, false, "Valid Post ID is required");
  }

  try {
    const cacheKey = `post:${userId}:${postId}`;
    const cached = await req.redisClient.get(cacheKey);
    
    if (cached) {
      return sendJson(res, 200, true, "Post retrieved successfully", JSON.parse(cached));
    }

    const raw = await prisma.post.findUnique({
      where: { id: postId },
      include: postInclude(userId!),
    });

    if (!raw) return sendJson(res, 404, false, "Post not found");

    const post = normalizePost(raw);
    await req.redisClient.set(cacheKey, JSON.stringify(post), "EX", SINGLE_POST_TTL);

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
  const { userId: profileIdentifier } = req.params;
  const viewerId = req.user.userId;

  if (typeof profileIdentifier !== "string" || !profileIdentifier) {
    return sendJson(res, 400, false, "Valid profile identifier is required");
  }

  // Added pagination to prevent OOM errors on large profiles
  const page = parsePage(req.query.page);
  const limit = parseLimit(req.query.limit, 50, 20);
  const skip = (page - 1) * limit;

  try {
    const resolvedProfile = await resolveProfileUser(profileIdentifier);
    if (!resolvedProfile) return sendJson(res, 404, false, "User not found");

    const profileId = resolvedProfile.id;

    if (profileId !== viewerId) {
      const blocked = await hasBlockingRelationship(viewerId, profileId);
      if (blocked) return sendJson(res, 403, false, "This profile is unavailable");
    }

    const [user, rawPosts, rawReposts, likedEntries, replies, isFollowing, followsYou] = await Promise.all([
      prisma.user.findUnique({
        where: { id: profileId },
        select: profileUserSelect,
      }),
      prisma.post.findMany({
        where: { userId: profileId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit, // Bounded
        skip,
        include: postInclude(viewerId!),
      }),
      prisma.repost.findMany({
        where: { userId: profileId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit, // Bounded
        skip,
        include: {
          user: { select: feedUserSelect },
          post: { include: postInclude(viewerId!) },
        },
      }),
      prisma.like.findMany({
        where: { userId: profileId },
        orderBy: { createdAt: "desc" },
        take: limit, // Bounded
        skip,
        include: { post: { include: postInclude(viewerId!) } },
      }),
      prisma.comment.findMany({
        where: { userId: profileId, parentId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: limit, // Bounded
        skip,
        include: {
          user: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true } },
          post: { select: { id: true, content: true, createdAt: true, user: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true } } } },
        },
      }),
      profileId === viewerId ? Promise.resolve(false) : prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: profileId } },
        select: { id: true },
      }).then(Boolean),
      profileId === viewerId ? Promise.resolve(false) : prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: profileId, followingId: viewerId } },
        select: { id: true },
      }).then(Boolean),
    ]);

    if (!user) return sendJson(res, 404, false, "User not found");

    const profileFeed = [
      ...rawPosts.map((post) => normalizePost(post, { feedEventId: `post:${post.id}`, feedCreatedAt: post.createdAt })),
      ...rawReposts.map((repost) => normalizePost(repost.post, { feedEventId: `repost:${repost.id}`, feedCreatedAt: repost.createdAt, repostedAt: repost.createdAt, repostedBy: repost.user })),
    ].sort(sortFeedEvents).slice(0, limit);

    return sendJson(res, 200, true, "Profile retrieved successfully", {
      user: {
        ...user,
        isFollowing,
        followsYou,
        isBlocked: profileId === viewerId ? false : Boolean(
          await prisma.block.findUnique({
            where: { blockerId_blockedId: { blockerId: viewerId, blockedId: profileId } },
            select: { id: true },
          })
        ),
        isMuted: profileId === viewerId ? false : Boolean(
          await prisma.mute.findUnique({
            where: { muterId_mutedId: { muterId: viewerId, mutedId: profileId } },
            select: { id: true },
          })
        ),
      },
      posts: profileFeed,
      likedPosts: likedEntries.map((entry) => normalizePost(entry.post)),
      replies,
      pagination: { page, limit } // Good practice to return current pagination state
    });
  } catch (err: any) {
    logger.error("Failed to fetch profile", { error: err.message, profileIdentifier });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET USER CONNECTIONS
// ==========================================
export const GetUserConnections = async (req: Request, res: Response) => {
  const { userId: profileIdentifier } = req.params;
  const viewerId = req.user.userId;
  const type = req.query.type === "following" ? "following" : "followers";

  if (typeof profileIdentifier !== "string" || !profileIdentifier) {
    return sendJson(res, 400, false, "Valid profile identifier is required");
  }

  try {
    const resolvedProfile = await resolveProfileUser(profileIdentifier);
    if (!resolvedProfile) return sendJson(res, 404, false, "User not found");

    const profileId = resolvedProfile.id;

    if (profileId !== viewerId) {
      const blocked = await hasBlockingRelationship(viewerId, profileId);
      if (blocked) return sendJson(res, 403, false, "Connections are unavailable");
    }

    const connections = await prisma.follow.findMany({
      where: type === "followers" ? { followingId: profileId } : { followerId: profileId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        follower: { select: connectionUserSelect },
        following: { select: connectionUserSelect },
      },
    });

    const blockedUserIds = await getBlockedUserIds(viewerId);

    const mappedUsers = connections.map((connection) =>
      type === "followers"
        ? { ...connection.follower, connectedAt: connection.createdAt }
        : { ...connection.following, connectedAt: connection.createdAt }
    );

    const visibleUsers = mappedUsers.filter((connection) => !blockedUserIds.has(connection.id));
    const connectionIds = visibleUsers.map((connection) => connection.id);

    const viewerLinks = connectionIds.length === 0 ? [] : await prisma.follow.findMany({
      where: {
        OR: [
          { followerId: viewerId, followingId: { in: connectionIds } },
          { followerId: { in: connectionIds }, followingId: viewerId },
        ],
      },
      select: { followerId: true, followingId: true },
    });

    const mappedViewerLinks = new Set(viewerLinks.map((link) => `${link.followerId}:${link.followingId}`));

    return sendJson(res, 200, true, "Connections retrieved successfully", {
      type,
      users: visibleUsers.map((connection) => {
        const isFollowing = mappedViewerLinks.has(`${viewerId}:${connection.id}`);
        const followsYou = mappedViewerLinks.has(`${connection.id}:${viewerId}`);
        return {
          ...connection,
          isFollowing,
          followsYou,
          canMessage: connection.id !== viewerId && (isFollowing || followsYou),
        };
      }),
    });
  } catch (err: any) {
    logger.error("Failed to fetch connections", { error: err.message, profileIdentifier, type });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// TOGGLE ACTIONS (FOLLOW, LIKE, BOOKMARK, REPOST, BLOCK, MUTE)
// ==========================================

export const ToggleFollowUser = async (req: Request, res: Response) => {
  const viewerId = req.user.userId;
  const { userId: targetUserId } = req.params;

  if (typeof targetUserId !== "string" || !targetUserId) return sendJson(res, 400, false, "Valid User ID is required");
  if (viewerId === targetUserId) return sendJson(res, 400, false, "You cannot follow yourself");

  try {
    const blocked = await hasBlockingRelationship(viewerId, targetUserId);
    if (blocked) return sendJson(res, 403, false, "You cannot follow a user with an active block");

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!targetUser) return sendJson(res, 404, false, "User not found");

    const existingFollow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
      select: { id: true },
    });

    let following = false;

    if (existingFollow) {
      await prisma.follow.delete({ where: { id: existingFollow.id } });
    } else {
      const follow = await prisma.follow.create({
        data: { followerId: viewerId, followingId: targetUserId },
      });
      following = true;
      publishEvent("social:follow-created", { followId: follow.id, followerId: viewerId, followingId: targetUserId } as FollowCreatedEvent);
    }

    const followersCount = await prisma.follow.count({ where: { followingId: targetUserId } });

    return sendJson(res, 200, true, following ? "User followed successfully" : "User unfollowed successfully", { targetUserId, following, followersCount });
  } catch (err: any) {
    logger.error("Failed to toggle follow", { error: err.message, viewerId, targetUserId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const TogglePostLike = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  if (typeof postId !== "string" || !postId) return sendJson(res, 400, false, "Valid Post ID is required");

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
    if (!post) return sendJson(res, 404, false, "Post not found");

    const existingLike = await prisma.like.findUnique({ where: { userId_postId: { userId, postId } } });
    let liked = false;

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
    } else {
      const like = await prisma.like.create({ data: { userId, postId } });
      liked = true;
      publishEvent("social:like-created", { likeId: like.id, postId, postOwnerId: post.userId, likerId: userId } as LikeCreatedEvent);
    }

    const likesCount = await prisma.like.count({ where: { postId } });
    await invalidatePostCache(req, postId);

    return sendJson(res, 200, true, liked ? "Post liked successfully" : "Post unliked successfully", { postId, liked, likesCount });
  } catch (err: any) {
    logger.error("Failed to toggle like", { error: err.message, postId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const TogglePostBookmark = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  if (typeof postId !== "string" || !postId) return sendJson(res, 400, false, "Valid Post ID is required");

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return sendJson(res, 404, false, "Post not found");

    const existingBookmark = await prisma.bookmark.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });

    let bookmarked = false;

    if (existingBookmark) {
      await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
    } else {
      await prisma.bookmark.create({ data: { userId, postId } });
      bookmarked = true;
    }

    await invalidatePostCache(req, postId);
    return sendJson(res, 200, true, bookmarked ? "Post bookmarked successfully" : "Bookmark removed successfully", { postId, bookmarked });
  } catch (err: any) {
    logger.error("Failed to toggle bookmark", { error: err.message, postId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const TogglePostRepost = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  const userId = req.user.userId;

  if (typeof postId !== "string" || !postId) return sendJson(res, 400, false, "Valid Post ID is required");

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, userId: true } });
    if (!post) return sendJson(res, 404, false, "Post not found");

    const existingRepost = await prisma.repost.findUnique({
      where: { userId_postId: { userId, postId } },
      select: { id: true },
    });

    let reposted = false;

    if (existingRepost) {
      await prisma.repost.delete({ where: { id: existingRepost.id } });
    } else {
      const repost = await prisma.repost.create({ data: { userId, postId } });
      reposted = true;
      publishEvent("social:repost-created", { repostId: repost.id, postId, postOwnerId: post.userId, repostedById: userId } as RepostCreatedEvent);
    }

    const repostsCount = await prisma.repost.count({ where: { postId } });
    await invalidatePostCache(req, postId);

    return sendJson(res, 200, true, reposted ? "Post reposted successfully" : "Repost removed successfully", { postId, reposted, repostsCount });
  } catch (err: any) {
    logger.error("Failed to toggle repost", { error: err.message, postId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const ToggleBlockUser = async (req: Request, res: Response) => {
  const viewerId = req.user.userId;
  const { userId: targetUserId } = req.params;

  if (typeof targetUserId !== "string" || !targetUserId || targetUserId === viewerId) return sendJson(res, 400, false, "Invalid user");

  try {
    const existingBlock = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: viewerId, blockedId: targetUserId } },
      select: { id: true },
    });

    let blocked = false;

    if (existingBlock) {
      await prisma.block.delete({ where: { id: existingBlock.id } });
    } else {
      await prisma.$transaction([
        prisma.block.create({ data: { blockerId: viewerId, blockedId: targetUserId } }),
        prisma.follow.deleteMany({
          where: {
            OR: [
              { followerId: viewerId, followingId: targetUserId },
              { followerId: targetUserId, followingId: viewerId },
            ],
          },
        }),
      ]);
      blocked = true;
    }

    return sendJson(res, 200, true, blocked ? "User blocked successfully" : "User unblocked successfully", { targetUserId, blocked });
  } catch (err: any) {
    logger.error("Failed to toggle block", { error: err.message, viewerId, targetUserId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const ToggleMuteUser = async (req: Request, res: Response) => {
  const viewerId = req.user.userId;
  const { userId: targetUserId } = req.params;

  if (typeof targetUserId !== "string" || !targetUserId || targetUserId === viewerId) return sendJson(res, 400, false, "Invalid user");

  try {
    const existingMute = await prisma.mute.findUnique({
      where: { muterId_mutedId: { muterId: viewerId, mutedId: targetUserId } },
      select: { id: true },
    });

    let muted = false;

    if (existingMute) {
      await prisma.mute.delete({ where: { id: existingMute.id } });
    } else {
      await prisma.mute.create({ data: { muterId: viewerId, mutedId: targetUserId } });
      muted = true;
    }

    return sendJson(res, 200, true, muted ? "User muted successfully" : "User unmuted successfully", { targetUserId, muted });
  } catch (err: any) {
    logger.error("Failed to toggle mute", { error: err.message, viewerId, targetUserId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// REPORTING
// ==========================================

export const ReportUser = async (req: Request, res: Response) => {
  const reporterId = req.user.userId;
  const { userId: targetUserId } = req.params;
  const { reason, details } = req.body as { reason?: string; details?: string };

  if (typeof targetUserId !== "string" || !targetUserId || targetUserId === reporterId) return sendJson(res, 400, false, "Invalid user");
  if (!reason || !isReportReason(reason)) return sendJson(res, 400, false, "Valid report reason is required");

  try {
    const report = await prisma.report.create({
      data: { reporterId, targetUserId, reason, details: normalizeReportDetails(details) },
      select: { id: true, reason: true, createdAt: true },
    });
    return sendJson(res, 201, true, "User reported successfully", report);
  } catch (err: any) {
    logger.error("Failed to report user", { error: err.message, reporterId, targetUserId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const ReportPost = async (req: Request, res: Response) => {
  const reporterId = req.user.userId;
  const { id: postId } = req.params;
  const { reason, details } = req.body as { reason?: string; details?: string };

  if (typeof postId !== "string" || !postId) return sendJson(res, 400, false, "Valid Post ID is required");
  if (!reason || !isReportReason(reason)) return sendJson(res, 400, false, "Valid report reason is required");

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return sendJson(res, 404, false, "Post not found");

    const report = await prisma.report.create({
      data: { reporterId, targetPostId: postId, reason, details: normalizeReportDetails(details) },
      select: { id: true, reason: true, createdAt: true },
    });
    return sendJson(res, 201, true, "Post reported successfully", report);
  } catch (err: any) {
    logger.error("Failed to report post", { error: err.message, reporterId, postId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// ADMIN ACTIONS
// ==========================================

export const GetAdminReports = async (req: Request, res: Response) => {
  if (!req.user.isAdmin) return sendJson(res, 403, false, "Admin access required");

  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const statusParam = String(req.query.status ?? "").trim().toUpperCase();
  const skip = (page - 1) * limit;

  if (statusParam && !isReportStatus(statusParam)) return sendJson(res, 400, false, "Invalid report status");

  try {
    const where = statusParam ? { status: statusParam as "OPEN" | "REVIEWED" | "DISMISSED" } : {};

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip,
        select: {
          id: true, reason: true, details: true, status: true, createdAt: true, updatedAt: true,
          reporter: { select: { id: true, username: true, handle: true, avatar: true } },
          targetUser: { select: { id: true, username: true, handle: true, avatar: true, isVerified: true } },
          targetPost: { select: { id: true, content: true, createdAt: true, user: { select: feedUserSelect } } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return sendJson(res, 200, true, "Reports retrieved successfully", { reports, pagination: buildPagination(page, limit, total) });
  } catch (err: any) {
    logger.error("Failed to fetch admin reports", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const UpdateAdminReportStatus = async (req: Request, res: Response) => {
  if (!req.user.isAdmin) return sendJson(res, 403, false, "Admin access required");

  const { id: reportId } = req.params;
  const { status } = req.body as { status?: string };

  if (typeof reportId !== "string" || !reportId) return sendJson(res, 400, false, "Valid report ID is required");
  if (!status || !isReportStatus(status)) return sendJson(res, 400, false, "Invalid report status");

  try {
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status: status as "OPEN" | "REVIEWED" | "DISMISSED" },
      select: { id: true, status: true, updatedAt: true },
    });
    return sendJson(res, 200, true, "Report status updated successfully", report);
  } catch (err: any) {
    if (err.code === "P2025") return sendJson(res, 404, false, "Report not found");
    logger.error("Failed to update report status", { error: err.message, reportId });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// UPDATE / DELETE POST
// ==========================================

export const UpdatePost = async (req: Request, res: Response) => {
  const { id: postId } = req.params;
  const { content } = req.body as { content?: string };

  if (typeof postId !== "string" || !postId) return sendJson(res, 400, false, "Valid Post ID is required");
  if (!content?.trim()) return sendJson(res, 400, false, "Content cannot be empty");

  try {
    const result = await prisma.post.updateMany({
      where: { id: postId, userId: req.user.userId! },
      data: { content: content.trim() },
    });

    if (result.count === 0) return sendJson(res, 403, false, "Post not found or unauthorized");

    await invalidatePostCache(req, postId);
    logger.info(`Post updated`, { postId });
    return sendJson(res, 200, true, "Post updated successfully");
  } catch (err: any) {
    logger.error("Failed to update post", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

export const DeletePost = async (req: Request, res: Response) => {
  const { id: postId } = req.params;

  if (typeof postId !== "string" || !postId) return sendJson(res, 400, false, "Valid Post ID is required");

  try {
    const result = await prisma.post.deleteMany({
      where: { id: postId, userId: req.user.userId! },
    });

    if (result.count === 0) return sendJson(res, 403, false, "Post not found or unauthorized");

    await invalidatePostCache(req, postId);
    logger.info(`Post deleted`, { postId });
    return sendJson(res, 200, true, "Post deleted successfully");
  } catch (err: any) {
    logger.error("Failed to delete post", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};