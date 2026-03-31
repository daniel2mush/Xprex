import { prisma } from "@social/db";
import { Request } from "express";
import logger from "../utils/logger";
import { feedUserSelect } from "../types/Types";

export const invalidatePostCache = async (req: Request, postId?: string) => {
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
export const postInclude = (userId: string) => ({
  user: {
    select: feedUserSelect,
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
      reposts: true,
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
  reposts: {
    where: { userId },
    select: { id: true },
    take: 1,
  },
});

// Flatten isLiked / isBookmarked into booleans for the client
export const normalizePost = (post: any, extra: Record<string, unknown> = {}) => ({
  ...post,
  ...extra,
  isLiked: post.likes?.length > 0,
  isBookmarked: post.bookmarks?.length > 0,
  isReposted: post.reposts?.length > 0,
  likes: undefined,
  bookmarks: undefined,
  reposts: undefined,
});

export const getFeedEventTimestamp = (post: {
  feedCreatedAt?: Date | string;
  createdAt: Date | string;
}) => new Date(post.feedCreatedAt ?? post.createdAt).getTime();

export const sortFeedEvents = (
  a: {
    feedEventId?: string;
    feedCreatedAt?: Date | string;
    createdAt: Date | string;
  },
  b: {
    feedEventId?: string;
    feedCreatedAt?: Date | string;
    createdAt: Date | string;
  },
) => {
  const timeDiff = getFeedEventTimestamp(b) - getFeedEventTimestamp(a);
  if (timeDiff !== 0) return timeDiff;

  return (b.feedEventId ?? "").localeCompare(a.feedEventId ?? "");
};

export const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasMore: page * limit < total,
});

export const parsePage = (value: unknown) =>
  Math.max(1, parseInt(value as string, 10) || 1);

export const parseLimit = (value: unknown, max = 20, fallback = 10) =>
  Math.min(max, Math.max(1, parseInt(value as string, 10) || fallback));

export const profileUserSelect = {
  id: true,
  email: true,
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
} as const;

export const connectionUserSelect = {
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
      followers: true,
      following: true,
      posts: true,
    },
  },
} as const;

export const getBlockedUserIds = async (userId: string) => {
  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: {
      blockerId: true,
      blockedId: true,
    },
  });

  return new Set<string>(
    blocks.flatMap((block) =>
      block.blockerId === userId ? [block.blockedId] : [block.blockerId],
    ),
  );
};

export const getMutedUserIds = async (userId: string) => {
  const mutes = await prisma.mute.findMany({
    where: { muterId: userId },
    select: { mutedId: true },
  });

  return new Set<string>(mutes.map((mute) => mute.mutedId));
};

export const getHiddenFeedUserIds = async (userId: string) => {
  const [blockedUserIds, mutedUserIds] = await Promise.all([
    getBlockedUserIds(userId),
    getMutedUserIds(userId),
  ]);

  return new Set<string>([...blockedUserIds, ...mutedUserIds]);
};

export const hasBlockingRelationship = async (
  firstUserId: string,
  secondUserId: string,
) => {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: firstUserId, blockedId: secondUserId },
        { blockerId: secondUserId, blockedId: firstUserId },
      ],
    },
    select: { id: true },
  });

  return Boolean(block);
};

export const normalizeProfileIdentifier = (value: string) =>
  value.trim().replace(/^@+/, "").toLowerCase();

export const resolveProfileUser = async (identifier: string) => {
  const normalizedIdentifier = normalizeProfileIdentifier(identifier);

  return prisma.user.findFirst({
    where: {
      OR: [
        { handle: normalizedIdentifier },
        {
          id: identifier,
          handle: null,
        },
      ],
    },
    select: {
      id: true,
      handle: true,
    },
  });
};