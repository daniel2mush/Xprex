import { prisma } from "@social/db";
import {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  ConversationPreview,
} from "../types/messaging";

type ConnectedUser = {
  id: string;
  username: string;
  avatar?: string | null;
  relationCreatedAt: string;
};

type StoredMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
};

const connectedUsers = new Map<string, number>();

const buildConversationId = (firstUserId: string, secondUserId: string) =>
  `dm:${[firstUserId, secondUserId].sort().join(":")}`;

const parseConversationId = (conversationId: string, userId: string) => {
  if (!conversationId.startsWith("dm:")) return null;

  const participantIds = conversationId.replace("dm:", "").split(":");
  if (participantIds.length !== 2 || !participantIds.includes(userId)) {
    return null;
  }

  const otherUserId = participantIds.find((id) => id !== userId);
  if (!otherUserId) return null;

  return {
    participantIds,
    otherUserId,
  };
};

const isUserOnline = (userId: string) => Boolean(connectedUsers.get(userId));

const toParticipant = (
  user: { id: string; username: string; avatar: string | null },
  currentUserId: string,
): ChatParticipant => ({
  id: user.id,
  username: user.username,
  avatar: user.avatar ?? undefined,
  isOnline: user.id === currentUserId ? true : isUserOnline(user.id),
});

const toChatMessage = (message: StoredMessage): ChatMessage => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
});

const getConnectedUsersFor = async (userId: string): Promise<ConnectedUser[]> => {
  const follows = await prisma.follow.findMany({
    where: {
      OR: [{ followerId: userId }, { followingId: userId }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      followerId: true,
      followingId: true,
      follower: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      following: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  const deduped = new Map<string, ConnectedUser>();

  for (const follow of follows) {
    const target =
      follow.followerId === userId ? follow.following : follow.follower;

    if (!target || target.id === userId || deduped.has(target.id)) {
      continue;
    }

    deduped.set(target.id, {
      id: target.id,
      username: target.username,
      avatar: target.avatar,
      relationCreatedAt: follow.createdAt.toISOString(),
    });
  }

  return [...deduped.values()];
};

const getConnectedUserFor = async (userId: string, targetUserId: string) => {
  const users = await getConnectedUsersFor(userId);
  return users.find((user) => user.id === targetUserId) ?? null;
};

const buildParticipants = async (currentUserId: string, otherUserId: string) => {
  const [currentUser, otherUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    }),
  ]);

  if (!currentUser || !otherUser) {
    return null;
  }

  return [
    toParticipant(currentUser, currentUserId),
    toParticipant(otherUser, currentUserId),
  ];
};

const ensureConversation = async (
  conversationId: string,
  participantIds: string[],
) => {
  await prisma.conversation.upsert({
    where: { id: conversationId },
    update: {},
    create: { id: conversationId },
  });

  await prisma.conversationParticipant.createMany({
    data: participantIds.map((userId) => ({
      conversationId,
      userId,
    })),
    skipDuplicates: true,
  });
};

const getUnreadCount = async (
  conversationId: string,
  userId: string,
  lastReadAt?: Date | null,
) =>
  prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });

export const markUserConnected = (userId: string) => {
  connectedUsers.set(userId, (connectedUsers.get(userId) ?? 0) + 1);
};

export const markUserDisconnected = (userId: string) => {
  const nextCount = (connectedUsers.get(userId) ?? 1) - 1;

  if (nextCount <= 0) {
    connectedUsers.delete(userId);
    return;
  }

  connectedUsers.set(userId, nextCount);
};

export const listConversations = async (userId: string) => {
  const contacts = await getConnectedUsersFor(userId);
  const conversationIds = contacts.map((contact) =>
    buildConversationId(userId, contact.id),
  );

  const storedConversations =
    conversationIds.length > 0
      ? await prisma.conversation.findMany({
          where: {
            id: {
              in: conversationIds,
            },
          },
          include: {
            participants: {
              where: { userId },
              select: {
                userId: true,
                lastReadAt: true,
              },
            },
            messages: {
              take: 1,
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              select: {
                id: true,
                conversationId: true,
                senderId: true,
                content: true,
                createdAt: true,
              },
            },
          },
        })
      : [];

  const conversationMap = new Map(
    storedConversations.map((conversation) => [conversation.id, conversation]),
  );

  const previews = await Promise.all(
    contacts.map(async (contact) => {
      const conversationId = buildConversationId(userId, contact.id);
      const conversation = conversationMap.get(conversationId);
      const lastMessage = conversation?.messages[0];
      const participantState = conversation?.participants[0];
      const unreadCount = conversation
        ? await getUnreadCount(
            conversationId,
            userId,
            participantState?.lastReadAt,
          )
        : 0;

      return {
        id: conversationId,
        participant: {
          id: contact.id,
          username: contact.username,
          avatar: contact.avatar ?? undefined,
          isOnline: isUserOnline(contact.id),
        },
        lastMessage: lastMessage ? toChatMessage(lastMessage) : undefined,
        updatedAt:
          lastMessage?.createdAt.toISOString() ??
          conversation?.lastMessageAt.toISOString() ??
          contact.relationCreatedAt,
        unreadCount,
      } satisfies ConversationPreview;
    }),
  );

  return previews.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
};

export const getConversationMessages = async (
  userId: string,
  conversationId: string,
): Promise<ChatConversation | null> => {
  const parsed = parseConversationId(conversationId, userId);
  if (!parsed) return null;

  const contact = await getConnectedUserFor(userId, parsed.otherUserId);
  if (!contact) return null;

  const participants = await buildParticipants(userId, parsed.otherUserId);
  if (!participants) return null;

  const storedConversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      lastMessageAt: true,
      messages: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  return {
    id: conversationId,
    participants,
    messages: storedConversation?.messages.map(toChatMessage) ?? [],
    updatedAt:
      storedConversation?.lastMessageAt.toISOString() ?? contact.relationCreatedAt,
  };
};

export const markConversationRead = async (
  userId: string,
  conversationId: string,
) => {
  const parsed = parseConversationId(conversationId, userId);
  if (!parsed) return;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { lastMessageAt: true },
  });

  if (!conversation) return;

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    update: {
      lastReadAt: conversation.lastMessageAt,
    },
    create: {
      conversationId,
      userId,
      lastReadAt: conversation.lastMessageAt,
    },
  });
};

export const appendMessage = async ({
  conversationId,
  senderId,
  content,
}: {
  conversationId: string;
  senderId: string;
  content: string;
}) => {
  const parsed = parseConversationId(conversationId, senderId);
  if (!parsed) return null;

  const contact = await getConnectedUserFor(senderId, parsed.otherUserId);
  if (!contact) return null;

  const participants = await buildParticipants(senderId, parsed.otherUserId);
  if (!participants) return null;

  await ensureConversation(conversationId, parsed.participantIds);
  const createdAt = new Date();

  const message = await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: createdAt,
      },
    });

    const createdMessage = await tx.message.create({
      data: {
        conversationId,
        senderId,
        content,
        createdAt,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        createdAt: true,
      },
    });

    await tx.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
      update: {
        lastReadAt: createdAt,
      },
      create: {
        conversationId,
        userId: senderId,
        lastReadAt: createdAt,
      },
    });

    return createdMessage;
  });

  const conversation = await getConversationMessages(senderId, conversationId);
  if (!conversation) return null;

  return {
    conversation: {
      ...conversation,
      participants,
    },
    message: toChatMessage(message),
  };
};
