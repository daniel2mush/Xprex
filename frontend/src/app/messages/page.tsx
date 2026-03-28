"use client";

import styles from "./Messages.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageSquare,
  Phone,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
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

export default function MessagesPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<string | undefined>(undefined);
  const activeMessagesRef = useRef<MessageItem[]>([]);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null | undefined
  >(undefined);
  const [draft, setDraft] = useState("");
  const [liveMessagesByConversation, setLiveMessagesByConversation] = useState<
    Record<string, MessageItem[]>
  >({});
  const [isSending, setIsSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 960px)").matches
      : false,
  );
  const requestedUserId = searchParams.get("userId");
  const requestedConversationId = searchParams.get("conversationId");

  const { data: conversationsData, isLoading: loadingConversations } =
    useGetConversations();
  const conversations = useMemo(
    () => conversationsData?.data ?? [],
    [conversationsData?.data],
  );

  const defaultConversationId = useMemo(() => {
    if (conversations.length === 0) return undefined;

    if (requestedConversationId) {
      const matchedConversation = conversations.find(
        (conversation) => conversation.id === requestedConversationId,
      );

      if (matchedConversation) {
        return matchedConversation.id;
      }
    }

    if (requestedUserId) {
      const matchedConversation = conversations.find(
        (conversation) => conversation.participant.id === requestedUserId,
      );

      if (matchedConversation) {
        return matchedConversation.id;
      }
    }

    return undefined;
  }, [
    conversations,
    requestedConversationId,
    requestedUserId,
  ]);

  const activeConversationId =
    selectedConversationId === undefined
      ? defaultConversationId
      : selectedConversationId ?? undefined;

  const syncConversationUrl = (conversationId?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (conversationId) {
      params.set("conversationId", conversationId);
    } else {
      params.delete("conversationId");
      params.delete("userId");
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `/messages?${nextQuery}` : "/messages", {
      scroll: false,
    });
  };

  const { data: conversationData, isLoading: loadingConversation } =
    useGetConversation(activeConversationId);
  const activeConversation = conversationData?.data;
  const activeParticipant = activeConversation?.participants.find(
    (participant) => participant.id !== user?.id,
  );
  const liveMessages =
    (activeConversationId
      ? liveMessagesByConversation[activeConversationId]
      : undefined) ??
    activeConversation?.messages ??
    [];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 960px)");
    const syncLayout = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
    };

    syncLayout(mediaQuery);
    mediaQuery.addEventListener("change", syncLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncLayout);
    };
  }, []);

  useEffect(() => {
    if (!activeConversation?.id) return;

    queryClient.setQueryData<ConversationsResponse | undefined>(
      ["messages", "conversations"],
      (current) =>
        current
          ? {
              ...current,
              data: current.data.map((conversation) =>
                conversation.id === activeConversation.id
                  ? { ...conversation, unreadCount: 0 }
                  : conversation,
              ),
            }
          : current,
    );
  }, [activeConversation?.id, queryClient]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    activeMessagesRef.current = activeConversation?.messages ?? [];
  }, [activeConversation?.messages]);

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
      setLiveMessagesByConversation((current) => {
        if (payload.conversationId !== activeConversationRef.current) {
          return current;
        }

        const currentMessages =
          current[payload.conversationId] ??
          (payload.conversationId === activeConversationRef.current
            ? activeMessagesRef.current
            : []);

        if (currentMessages.some((message) => message.id === payload.message.id)) {
          return current;
        }

        return {
          ...current,
          [payload.conversationId]: [...currentMessages, payload.message],
        };
      });

      queryClient.setQueryData<ConversationsResponse | undefined>(
        ["messages", "conversations"],
        (current) =>
          current
            ? {
                ...current,
                data:
                  current.data
                    .map((conversation) =>
                      conversation.id === payload.conversationId
                        ? {
                            ...conversation,
                            lastMessage: payload.message,
                            updatedAt: payload.message.createdAt,
                            unreadCount:
                              payload.conversationId === activeConversationRef.current
                                ? 0
                                : conversation.unreadCount +
                                  (payload.message.senderId === user?.id ? 0 : 1),
                          }
                        : conversation,
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime(),
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
      <aside
        className={`${styles.sidebar} ${
          isMobileLayout && activeConversationId ? styles.mobileHidden : ""
        }`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeaderCopy}>
            {isMobileLayout && (
              <button
                type="button"
                className={styles.panelBackButton}
                aria-label="Go back"
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back();
                    return;
                  }

                  router.push("/");
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
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
                onClick={() => {
                  setSelectedConversationId(conversation.id);
                  if (isMobileLayout) {
                    syncConversationUrl(conversation.id);
                  }
                }}
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

      <main
        className={`${styles.chatPanel} ${
          isMobileLayout && !activeConversationId ? styles.mobileHidden : ""
        }`}
      >
        {!activeConversationId && !isMobileLayout && (
          <div className={styles.emptyState}>
            <MessageSquare size={36} />
            <h2>No conversation selected</h2>
            <p>Click a person to chat and the conversation will open here.</p>
          </div>
        )}

        {activeConversationId && (
          <>
            <header className={styles.chatHeader}>
              <div className={styles.chatIdentity}>
                {isMobileLayout && (
                  <button
                    type="button"
                    className={styles.backButton}
                    aria-label="Back to conversations"
                    onClick={() => {
                      setSelectedConversationId(null);
                      syncConversationUrl();
                    }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
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
