"use client";

import styles from "./Messages.module.scss";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Phone, Search, Send, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  ConversationPreview,
  ConversationsResponse,
  ConversationResponse,
  MessageItem,
} from "@/types/Types";
import { useGetConversation, useGetConversations } from "@/query/MessagingQuery";
import { useUserStore } from "@/store/userStore";
import { timeAgoShort } from "@/lib/ParseDate";
import { Button } from "@/ui/Buttons/Buttons";

const MESSAGING_URL =
  process.env.NEXT_PUBLIC_MESSAGING_URL ?? "http://localhost:4007";

type IncomingMessagePayload = {
  conversationId: string;
  message: MessageItem;
};

const upsertConversationPreview = (
  conversations: ConversationPreview[] | undefined,
  conversationId: string,
  message: MessageItem,
) => {
  if (!conversations) return conversations;

  const updated = conversations.map((conversation) =>
    conversation.id === conversationId
      ? {
          ...conversation,
          lastMessage: message,
          updatedAt: message.createdAt,
        }
      : conversation,
  );

  updated.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return updated;
};

export default function MessagesPage() {
  const { user } = useUserStore();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<string | undefined>(undefined);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [liveMessages, setLiveMessages] = useState<MessageItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const requestedUserId = searchParams.get("userId");
  const requestedConversationId = searchParams.get("conversationId");

  const { data: conversationsData, isLoading: loadingConversations } =
    useGetConversations();
  const { data: conversationData, isLoading: loadingConversation } =
    useGetConversation(activeConversationId);

  const conversations = conversationsData?.data ?? [];
  const activeConversation = conversationData?.data;
  const activeParticipant = activeConversation?.participants.find(
    (participant) => participant.id !== user?.id,
  );

  useEffect(() => {
    if (conversations.length === 0) return;

    if (requestedConversationId) {
      const matchedConversation = conversations.find(
        (conversation) => conversation.id === requestedConversationId,
      );

      if (matchedConversation) {
        setActiveConversationId(matchedConversation.id);
        return;
      }
    }

    if (requestedUserId) {
      const matchedConversation = conversations.find(
        (conversation) => conversation.participant.id === requestedUserId,
      );

      if (matchedConversation) {
        setActiveConversationId(matchedConversation.id);
        return;
      }
    }

    if (!activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [
    activeConversationId,
    conversations,
    requestedConversationId,
    requestedUserId,
  ]);

  useEffect(() => {
    setLiveMessages(activeConversation?.messages ?? []);
  }, [activeConversation?.id, activeConversation?.messages]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(`${MESSAGING_URL}/messages`, {
      transports: ["websocket"],
      auth: {
        userId: user.id,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    socket.on("message:new", (payload: IncomingMessagePayload) => {
      setLiveMessages((current) => {
        if (payload.conversationId !== activeConversationRef.current) {
          return current;
        }

        if (current.some((message) => message.id === payload.message.id)) {
          return current;
        }

        return [...current, payload.message];
      });

      queryClient.setQueryData<ConversationsResponse | undefined>(
        ["messages", "conversations"],
        (current) =>
          current
            ? {
                ...current,
                data:
                  upsertConversationPreview(
                    current.data,
                    payload.conversationId,
                    payload.message,
                  ) ?? current.data,
              }
            : current,
      );

      queryClient.setQueryData<ConversationResponse | undefined>(
        ["messages", "conversation", payload.conversationId],
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  messages: current.data.messages.some(
                    (message) => message.id === payload.message.id,
                  )
                    ? current.data.messages
                    : [...current.data.messages, payload.message],
                  updatedAt: payload.message.createdAt,
                },
              }
            : current,
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!socketRef.current || !activeConversationId) return;
    socketRef.current.emit("message:join", activeConversationId);
  }, [activeConversationId]);

  const handleSend = () => {
    const socket = socketRef.current;
    const content = draft.trim();

    if (!socket || !activeConversationId || !content || !user?.id) return;

    setIsSending(true);

    socket.emit(
      "message:send",
      {
        conversationId: activeConversationId,
        content,
      },
      (response: {
        success: boolean;
        message?: string;
        data?: IncomingMessagePayload;
      }) => {
        setIsSending(false);

        if (!response.success || !response.data) {
          return;
        }

        setDraft("");
        if (composerRef.current) {
          composerRef.current.style.height = "auto";
        }
      },
    );
  };

  return (
    <section className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <p className={styles.eyebrow}>Realtime chat</p>
            <h1 className={styles.title}>Messages</h1>
          </div>
          <span
            className={`${styles.statusBadge} ${isSocketConnected ? styles.connected : ""}`}
          >
            <Sparkles size={12} />
            {isSocketConnected ? "Live" : "Connecting"}
          </span>
        </div>

        <div className={styles.searchBox}>
          <Search size={15} />
          <input placeholder="Search conversations" disabled />
        </div>

        <div className={styles.conversationList}>
          {loadingConversations &&
            [...Array(4)].map((_, index) => (
              <div key={index} className={styles.conversationSkeleton} />
            ))}

          {!loadingConversations && conversations.length === 0 && (
            <div className={styles.emptyState}>
              <MessageSquare size={28} />
              <h2>No message connections yet</h2>
              <p>Only people you follow or who follow you can appear here.</p>
            </div>
          )}

          {!loadingConversations &&
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={`${styles.conversationItem} ${
                  activeConversationId === conversation.id
                    ? styles.conversationActive
                    : ""
                }`}
                onClick={() => setActiveConversationId(conversation.id)}
              >
                {conversation.participant.avatar ? (
                  <img
                    src={conversation.participant.avatar}
                    alt={conversation.participant.username}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {conversation.participant.username[0].toUpperCase()}
                  </div>
                )}

                <div className={styles.conversationMeta}>
                  <div className={styles.conversationTopRow}>
                    <span className={styles.conversationName}>
                      {conversation.participant.username}
                    </span>
                    <span className={styles.conversationTime}>
                      {timeAgoShort(new Date(conversation.updatedAt))}
                    </span>
                  </div>
                  <p className={styles.conversationPreview}>
                    {conversation.lastMessage?.content ?? "Start the conversation"}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </aside>

      <main className={styles.chatPanel}>
        {!activeConversationId && (
          <div className={styles.emptyState}>
            <MessageSquare size={36} />
            <h2>No conversation selected</h2>
            <p>Choose a chat from the left rail to begin messaging.</p>
          </div>
        )}

        {activeConversationId && (
          <>
            <header className={styles.chatHeader}>
              <div className={styles.chatIdentity}>
                {activeParticipant?.avatar ? (
                  <img
                    src={activeParticipant.avatar}
                    alt={activeParticipant.username}
                    className={styles.chatAvatar}
                  />
                ) : (
                  <div className={styles.chatAvatarFallback}>
                    {activeParticipant?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <h2 className={styles.chatName}>
                    {activeParticipant?.username ?? "Conversation"}
                  </h2>
                  <p className={styles.chatStatus}>
                    {activeParticipant?.isOnline ? "Online now" : "Offline"}
                  </p>
                </div>
              </div>

              <button className={styles.callButton} type="button">
                <Phone size={16} />
              </button>
            </header>

            <div className={styles.messageStream}>
              {loadingConversation && (
                <div className={styles.emptyState}>
                  <p>Loading conversation...</p>
                </div>
              )}

              {!loadingConversation &&
                liveMessages.map((message) => {
                  const ownMessage = message.senderId === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`${styles.messageRow} ${
                        ownMessage ? styles.ownMessageRow : ""
                      }`}
                    >
                      <div
                        className={`${styles.messageBubble} ${
                          ownMessage ? styles.ownMessageBubble : ""
                        }`}
                      >
                        <p>{message.content}</p>
                        <span>{timeAgoShort(new Date(message.createdAt))}</span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <footer className={styles.composer}>
              <textarea
                ref={composerRef}
                value={draft}
                rows={1}
                placeholder="Write a message..."
                className={styles.composerInput}
                onChange={(event) => {
                  setDraft(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${event.target.scrollHeight}px`;
                }}
              />

              <Button onClick={handleSend} isLoading={isSending} disabled={!draft.trim()}>
                <Send size={14} />
                Send
              </Button>
            </footer>
          </>
        )}
      </main>
    </section>
  );
}
