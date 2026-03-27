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

// ==========================================
// SEARCH POSTS
// ==========================================
export const searchPosts = async (req: Request, res: Response) => {
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    const rawQuery = req.query.search;

    if (!rawQuery || typeof rawQuery !== "string" || rawQuery.trim() === "") {
      return sendJson(res, 400, false, "Search query is required");
    }

    const query = rawQuery.trim();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

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
    // prisma.search.create({
    //   data:{

    //   }
    // })
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
// GET SEARCH HISTORY
// ==========================================
export const getSearchHistory = async (req: Request, res: Response) => {
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
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
  const userId = req.user.userId;
  if (!userId) return sendJson(res, 401, false, "Unauthorized");

  try {
    await prisma.search.deleteMany({ where: { userId } });
    return sendJson(res, 200, true, "Search history cleared");
  } catch (err: any) {
    logger.error("Failed to clear search history", { error: err.message });
    return sendJson(res, 500, false, "Internal server error");
  }
};
