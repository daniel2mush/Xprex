import { prisma } from "@social/db";
import { randomUUID } from "crypto";
import {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
} from "../types/messaging";

type StoredConversation = {
  messages: ChatMessage[];
  updatedAt: string;
};

type ConnectedUser = {
  id: string;
  username: string;
  avatar?: string | null;
  relationCreatedAt: string;
};

const conversations = new Map<string, StoredConversation>();
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

  return contacts
    .map((contact) => {
      const conversationId = buildConversationId(userId, contact.id);
      const conversation = conversations.get(conversationId);
      const lastMessage = conversation?.messages[conversation.messages.length - 1];

      return {
        id: conversationId,
        participant: {
          id: contact.id,
          username: contact.username,
          avatar: contact.avatar ?? undefined,
          isOnline: isUserOnline(contact.id),
        },
        lastMessage,
        updatedAt: lastMessage?.createdAt ?? conversation?.updatedAt ?? contact.relationCreatedAt,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
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

  const storedConversation = conversations.get(conversationId);

  return {
    id: conversationId,
    participants,
    messages: storedConversation?.messages ?? [],
    updatedAt:
      storedConversation?.updatedAt ?? contact.relationCreatedAt,
  };
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

  const currentConversation = conversations.get(conversationId) ?? {
    messages: [],
    updatedAt: contact.relationCreatedAt,
  };

  const message: ChatMessage = {
    id: randomUUID(),
    conversationId,
    senderId,
    content,
    createdAt: new Date().toISOString(),
  };

  const nextConversation: StoredConversation = {
    messages: [...currentConversation.messages, message],
    updatedAt: message.createdAt,
  };

  conversations.set(conversationId, nextConversation);

  return {
    conversation: {
      id: conversationId,
      participants,
      messages: nextConversation.messages,
      updatedAt: nextConversation.updatedAt,
    },
    message,
  };
};
