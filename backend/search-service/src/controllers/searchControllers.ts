import { Request, Response } from "express";
import logger from "../utils/logger";
import { prisma } from "@social/db";
import { sendJson } from "../utils/responseHelper";

// ==========================================
// CONSTANTS
// ==========================================
const SEARCH_CACHE_TTL = 300; // 5 minutes

// ==========================================
// HELPERS
// ==========================================
const invalidateSearchCache = async (req: Request) => {
  try {
    const keys = await req.redisClient.keys("search:*");
    if (keys.length > 0) {
      await req.redisClient.del(...keys);
      logger.info(`Search cache invalidated (${keys.length} keys)`);
    }
  } catch (err) {
    logger.warn("Search cache invalidation failed (non-blocking)", err);
  }
};

const getSearchVersion = async (req: Request): Promise<number> => {
  const version = await req.redisClient.get("search_version");
  return version ? parseInt(version) : 1;
};

// Consistent post shape for search results
const searchPostInclude = (userId: string) => ({
  user: {
    select: {
      id: true,
      username: true,
      handle: true,
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

const normalizePost = (post: any) => ({
  ...post,
  isLiked: post.likes?.length > 0,
  isBookmarked: post.bookmarks?.length > 0,
  likes: undefined,
  bookmarks: undefined,
});

const normalizeQuery = (value: string) => value.trim().replace(/^#+/, "");

const searchUserSelect = (userId: string) => ({
  id: true,
  username: true,
  handle: true,
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
  following: {
    where: { followingId: userId },
    select: { id: true },
    take: 1,
  },
  followers: {
    where: { followerId: userId },
    select: { id: true },
    take: 1,
  },
});

const normalizeUser = (user: any) => {
  const isFollowing = user.following?.length > 0;
  const followsYou = user.followers?.length > 0;

  return {
    ...user,
    isFollowing,
    followsYou,
    canMessage: isFollowing || followsYou,
    following: undefined,
    followers: undefined,
  };
};

const getExcludedUserIds = async (userId: string) => {
  const [blocks, mutes] = await Promise.all([
    prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    }),
    prisma.mute.findMany({
      where: { muterId: userId },
      select: { mutedId: true },
    }),
  ]);

  return new Set([
    ...blocks.flatMap((block) =>
      block.blockerId === userId ? [block.blockedId] : [block.blockerId],
    ),
    ...mutes.map((mute) => mute.mutedId),
  ]);
};

// ==========================================
// SEARCH POSTS
// ==========================================
export const searchPosts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendJson(res, 401, false, "Unauthorized");

    const rawQuery = req.query.search;

    if (!rawQuery || typeof rawQuery !== "string" || rawQuery.trim() === "") {
      return sendJson(res, 400, false, "Search query is required");
    }

    const query = normalizeQuery(rawQuery);

    if (!query) {
      return sendJson(res, 400, false, "Search query is required");
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    const excludedUserIds = [...(await getExcludedUserIds(userId))];

    const version = await getSearchVersion(req);
    const cacheKey = `search:v${version}:${userId}:${page}:${limit}:${query.trim()}`;

    // 1. Cache check
    const cached = await req.redisClient.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit → ${cacheKey}`);
      return sendJson(
        res,
        200,
        true,
        "Search results retrieved",
        JSON.parse(cached),
      );
    }

    logger.info(`DB search`, { query, userId });

    // 2. Search posts by content + username
    const whereClause = {
      ...(excludedUserIds.length
        ? {
            userId: {
              notIn: excludedUserIds,
            },
          }
        : {}),
      OR: [
        {
          content: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
        {
          user: {
            username: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        },
      ],
    };

    const [rawPosts, total] = await Promise.all([
      prisma.post.findMany({
        where: whereClause,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: searchPostInclude(userId),
      }),
      prisma.post.count({ where: whereClause }),
    ]);

    const posts = rawPosts.map(normalizePost);

    const responseData = {
      posts,
      query: query,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };

    // 3. Cache results
    await req.redisClient.set(
      cacheKey,
      JSON.stringify(responseData),
      "EX",
      SEARCH_CACHE_TTL,
    );

    // 4. Save to search history (fire and forget — don't block the response)
    prisma.search
      .create({
        data: {
          query: query,
          userId,
          postId: rawPosts[0]?.id ?? null, // link to top result if any
        },
      })
      .catch((err) => logger.warn("Failed to save search history", err));

    return sendJson(res, 200, true, "Search results retrieved", responseData);
  } catch (err: any) {
    logger.error("Search failed", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// SEARCH USERS
// ==========================================
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendJson(res, 401, false, "Unauthorized");

    const rawQuery = req.query.search;

    if (!rawQuery || typeof rawQuery !== "string" || rawQuery.trim() === "") {
      return sendJson(res, 400, false, "Search query is required");
    }

    const query = normalizeQuery(rawQuery);

    if (!query) {
      return sendJson(res, 400, false, "Search query is required");
    }

    const limit = Math.min(
      12,
      Math.max(1, parseInt(req.query.limit as string) || 8),
    );
    const excludedUserIds = [...(await getExcludedUserIds(userId))];

    const rawUsers = await prisma.user.findMany({
      where: {
        id: { notIn: [userId, ...excludedUserIds] },
        OR: [
          {
            username: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            handle: {
              contains: query.toLowerCase(),
              mode: "insensitive",
            },
          },
          {
            bio: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            location: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      take: limit,
      orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
      select: searchUserSelect(userId),
    });

    return sendJson(res, 200, true, "User results retrieved", {
      users: rawUsers.map(normalizeUser),
      query,
    });
  } catch (err: any) {
    logger.error("User search failed", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET TRENDING DISCOVERY
// ==========================================
export const getTrendingDiscovery = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendJson(res, 401, false, "Unauthorized");

    const excludedUserIds = [...(await getExcludedUserIds(userId))];

    const [recentPosts, recentSearches] = await Promise.all([
      prisma.post.findMany({
        where: excludedUserIds.length
          ? {
              userId: {
                notIn: excludedUserIds,
              },
            }
          : undefined,
        take: 250,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: {
            select: {
              id: true,
              username: true,
              handle: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.search.findMany({
        take: 200,
        orderBy: { createdAt: "desc" },
        select: { query: true },
      }),
    ]);

    const ignore = new Set([
      "this",
      "that",
      "with",
      "from",
      "have",
      "your",
      "about",
      "there",
      "their",
      "would",
      "could",
      "should",
      "what",
      "when",
      "where",
      "which",
      "while",
      "into",
      "just",
      "been",
      "being",
      "also",
      "them",
    ]);

    const tokenCounts = new Map<string, number>();
    const creatorCounts = new Map<
      string,
      { id: string; username: string; handle?: string | null; avatar?: string | null; count: number }
    >();

    [...recentPosts.map((post) => post.content), ...recentSearches.map((search) => search.query)]
      .forEach((content) => {
        content
          .toLowerCase()
          .match(/#?[a-z0-9]{4,}/g)
          ?.filter((token) => !ignore.has(token.replace(/^#/, "")))
          .forEach((token) => {
            const normalized = token.startsWith("#") ? token : `#${token}`;
            tokenCounts.set(normalized, (tokenCounts.get(normalized) ?? 0) + 1);
          });
      });

    recentPosts.forEach((post) => {
      const existing = creatorCounts.get(post.user.id);
      creatorCounts.set(post.user.id, {
        id: post.user.id,
        username: post.user.username,
        handle: post.user.handle,
        avatar: post.user.avatar,
        count: (existing?.count ?? 0) + 1,
      });
    });

    return sendJson(res, 200, true, "Trending discovery retrieved", {
      topics: [...tokenCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({
          label,
          searchValue: label.replace(/^#/, ""),
          count,
        })),
      creators: [...creatorCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    });
  } catch (err: any) {
    logger.error("Failed to get trending discovery", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// GET SEARCH HISTORY
// ==========================================
export const getSearchHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendJson(res, 401, false, "Unauthorized");

    const history = await prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10, // last 10 searches
      select: {
        id: true,
        query: true,
        createdAt: true,
      },
    });

    return sendJson(res, 200, true, "Search history retrieved", history);
  } catch (err: any) {
    logger.error("Failed to fetch search history", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};

// ==========================================
// CLEAR SEARCH HISTORY
// ==========================================
export const clearSearchHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return sendJson(res, 401, false, "Unauthorized");

    await prisma.search.deleteMany({ where: { userId } });
    return sendJson(res, 200, true, "Search history cleared");
  } catch (err: any) {
    logger.error("Failed to clear search history", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};
