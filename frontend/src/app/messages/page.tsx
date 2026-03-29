"use client";

import styles from "./Messages.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ConversationsResponse,
  ConversationResponse,
  MediaItem,
  MessageItem,
} from "@/types/Types";
import {
  useGetConversation,
  useGetConversations,
  useUploadMessageAttachments,
} from "@/query/MessagingQuery";
import { useUserStore } from "@/store/userStore";
import { timeAgoShort } from "@/lib/ParseDate";
import { Button } from "@/ui/Buttons/Buttons";
import { toast } from "sonner";

const MESSAGING_URL =
  process.env.NEXT_PUBLIC_MESSAGING_URL ?? "http://localhost:4007";

type IncomingMessagePayload = {
  conversationId: string;
  message: MessageItem;
};

type ReadReceiptPayload = {
  conversationId: string;
  userId: string;
  readAt: string;
};

type TypingPayload = {
  conversationId: string;
  userId: string;
};

export default function MessagesPage() {
  const { user } = useUserStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<string | undefined>(undefined);
  const activeMessagesRef = useRef<MessageItem[]>([]);
  const messageStreamRef = useRef<HTMLDivElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<MediaItem[]>([]);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null | undefined
  >(undefined);
  const [draft, setDraft] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [liveMessagesByConversation, setLiveMessagesByConversation] = useState<
    Record<string, MessageItem[]>
  >({});
  const [typingByConversation, setTypingByConversation] = useState<
    Record<string, boolean>
  >({});
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 960px)").matches
      : false,
  );
  const requestedUserId = searchParams.get("userId");
  const requestedConversationId = searchParams.get("conversationId");
  const { mutateAsync: uploadAttachments, isPending: isUploadingAttachments } =
    useUploadMessageAttachments();

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
  const liveMessages = useMemo(
    () =>
      (activeConversationId
        ? liveMessagesByConversation[activeConversationId]
        : undefined) ??
      activeConversation?.messages ??
      [],
    [
      activeConversation?.messages,
      activeConversationId,
      liveMessagesByConversation,
    ],
  );
  const filteredConversations = conversations.filter((conversation) =>
    conversation.participant.username
      .toLowerCase()
      .includes(conversationSearch.trim().toLowerCase()),
  );
  const otherParticipantReadAt = activeConversation?.otherParticipantLastReadAt;
  const isOtherParticipantTyping = Boolean(
    activeConversationId && typingByConversation[activeConversationId],
  );

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
    attachmentsRef.current = attachments;
  }, [attachments]);

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

    socket.on("message:read", (payload: ReadReceiptPayload) => {
      if (payload.userId === user?.id) return;

      queryClient.setQueryData<ConversationResponse | undefined>(
        ["messages", "conversation", payload.conversationId],
        (current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  otherParticipantLastReadAt: payload.readAt,
                },
              }
            : current,
      );
    });

    socket.on("message:typing", (payload: TypingPayload) => {
      if (payload.userId === user?.id) return;

      setTypingByConversation((current) => ({
        ...current,
        [payload.conversationId]: true,
      }));
    });

    socket.on("message:typing-stop", (payload: TypingPayload) => {
      if (payload.userId === user?.id) return;

      setTypingByConversation((current) => ({
        ...current,
        [payload.conversationId]: false,
      }));
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

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeConversationId) return;

    if (!draft.trim()) {
      socket.emit("message:typing-stop", {
        conversationId: activeConversationId,
      });
      return;
    }

    socket.emit("message:typing", {
      conversationId: activeConversationId,
    });

    const timeout = window.setTimeout(() => {
      socket.emit("message:typing-stop", {
        conversationId: activeConversationId,
      });
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [activeConversationId, draft]);

  useEffect(() => {
    setAttachments([]);
  }, [activeConversationId]);

  const cleanupUploadedAttachments = async (items: MediaItem[]) => {
    if (items.length === 0) return;

    await Promise.allSettled(
      items.map((item) =>
        fetch(`/api/media/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      ),
    );
  };

  useEffect(() => {
    return () => {
      void cleanupUploadedAttachments(attachmentsRef.current);
    };
  }, [activeConversationId]);

  useEffect(() => {
    return () => {
      void cleanupUploadedAttachments(attachmentsRef.current);
    };
  }, []);

  const scrollToLatestMessage = (behavior: ScrollBehavior = "auto") => {
    const stream = messageStreamRef.current;
    if (!stream) return;

    stream.scrollTo({
      top: stream.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    if (!activeConversationId || loadingConversation) return;

    const frame = window.requestAnimationFrame(() => {
      scrollToLatestMessage();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeConversationId, liveMessages, loadingConversation]);

  useEffect(() => {
    const content = messageContentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      scrollToLatestMessage();
    });

    observer.observe(content);

    return () => observer.disconnect();
  }, [activeConversationId]);

  const handleAttachmentSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    try {
      const uploaded = await uploadAttachments(files);
      setAttachments((current) => [...current, ...uploaded].slice(0, 4));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Attachment upload failed",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleSend = () => {
    const socket = socketRef.current;
    const content = draft.trim();
    const mediaIds = attachments.map((attachment) => attachment.id);

    if (
      !socket ||
      !activeConversationId ||
      (!content && mediaIds.length === 0) ||
      !user?.id
    ) {
      return;
    }

    setIsSending(true);

    socket.emit(
      "message:send",
      {
        conversationId: activeConversationId,
        content,
        mediaIds,
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

        socket.emit("message:typing-stop", {
          conversationId: activeConversationId,
        });
        setDraft("");
        if (composerRef.current) {
          composerRef.current.style.height = "auto";
        }
        setAttachments([]);
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
          <input
            placeholder="Search conversations"
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
          />
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
            filteredConversations.map((conversation) => (
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
                  <Image
                    src={conversation.participant.avatar}
                    alt={conversation.participant.username}
                    className={styles.avatar}
                    width={48}
                    height={48}
                    unoptimized
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
                  <Image
                    src={activeParticipant.avatar}
                    alt={activeParticipant.username}
                    className={styles.chatAvatar}
                    width={48}
                    height={48}
                    unoptimized
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
                    {isOtherParticipantTyping
                      ? "Typing..."
                      : activeParticipant?.isOnline
                        ? "Online now"
                        : "Offline"}
                  </p>
                </div>
              </div>
            </header>

            <div ref={messageStreamRef} className={styles.messageStream}>
              <div ref={messageContentRef} className={styles.messageContent}>
                {loadingConversation && (
                  <div className={styles.emptyState}>
                    <p>Loading conversation...</p>
                  </div>
                )}

                {!loadingConversation &&
                  liveMessages.map((message) => {
                    const ownMessage = message.senderId === user?.id;
                    const seen =
                      ownMessage &&
                      otherParticipantReadAt &&
                      new Date(otherParticipantReadAt).getTime() >=
                        new Date(message.createdAt).getTime();

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
                          {message.content && <p>{message.content}</p>}
                          {message.media.length > 0 && (
                            <div className={styles.messageMediaGrid}>
                              {message.media.map((media) => (
                                <div
                                  key={media.id}
                                  className={styles.messageMediaCard}
                                >
                                  {media.type === "VIDEO" ? (
                                    <video
                                      src={media.url}
                                      controls
                                      preload="metadata"
                                      className={styles.messageMedia}
                                      onLoadedMetadata={() =>
                                        scrollToLatestMessage()
                                      }
                                    />
                                  ) : (
                                    <Image
                                      src={media.url}
                                      alt=""
                                      className={styles.messageMedia}
                                      width={320}
                                      height={220}
                                      unoptimized
                                      onLoad={() => scrollToLatestMessage()}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <span>{timeAgoShort(new Date(message.createdAt))}</span>
                          {seen && (
                            <span className={styles.messageSeen}>Seen</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <footer className={styles.composer}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className={styles.fileInput}
                onChange={handleAttachmentSelection}
              />
              <button
                type="button"
                className={styles.attachButton}
                aria-label="Add attachment"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachments || attachments.length >= 4}
              >
                <Paperclip size={16} />
              </button>

              {attachments.length > 0 && (
                <div className={styles.attachmentTray}>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className={styles.attachmentChip}>
                      {attachment.type === "VIDEO" ? (
                        <video
                          src={attachment.url}
                          className={styles.attachmentPreview}
                          preload="metadata"
                        />
                      ) : (
                        <Image
                          src={attachment.url}
                          alt=""
                          className={styles.attachmentPreview}
                          width={72}
                          height={72}
                          unoptimized
                        />
                      )}
                      <button
                        type="button"
                        className={styles.removeAttachment}
                        aria-label="Remove attachment"
                        onClick={() => {
                          setAttachments((current) =>
                            current.filter((item) => item.id !== attachment.id),
                          );
                          void cleanupUploadedAttachments([attachment]);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

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

              <Button
                onClick={handleSend}
                isLoading={isSending}
                disabled={(!draft.trim() && attachments.length === 0) || isUploadingAttachments}
              >
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
