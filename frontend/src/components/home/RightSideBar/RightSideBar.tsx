"use client";

import styles from "./RightSideBar.module.scss";
import Image from "next/image";
import Link from "next/link";
import { getProfilePath } from "@/lib/profile";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  Flame,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetNotifications } from "@/query/NotificationsQuery";
import { useGetConversations } from "@/query/MessagingQuery";
import {
  useClearSearchHistory,
  useSearchHistory,
  useTrendingDiscovery,
} from "@/query/SearchQuery";
import { timeAgoShort } from "@/lib/ParseDate";
import { MessageItem, NotificationTypes } from "@/types/Types";

const getConversationPreview = (message?: MessageItem) => {
  if (!message) {
    return "Start a chat";
  }

  const content = message.content.trim();
  if (content) {
    return content;
  }

  if (message.media.length === 1) {
    const mediaType = message.media[0].type;

    if (mediaType === "VIDEO") {
      return "Shared a video";
    }

    if (mediaType === "GIF") {
      return "Shared a GIF";
    }

    return "Shared a photo";
  }

  return `Shared ${message.media.length} attachments`;
};

const formatCompactCount = (count: number, label: string) =>
  `${count} ${label}${count === 1 ? "" : "s"}`;

const getNotificationSummary = (type: NotificationTypes["type"]) => {
  switch (type) {
    case "LIKE":
      return "liked your post";
    case "COMMENT":
      return "commented on your post";
    case "REPLY":
      return "replied to you";
    case "FOLLOW":
      return "followed you";
    case "REPOST":
      return "reposted your post";
    case "MESSAGE":
      return "sent a message";
    default:
      return "sent an update";
  }
};

export default function RightSideBar() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: notificationsData } = useGetNotifications();
  const { data: conversationsData } = useGetConversations();
  const { data: historyData } = useSearchHistory();
  const { data: trendingData } = useTrendingDiscovery();
  const { mutate: clearSearchHistory, isPending: clearingHistory } =
    useClearSearchHistory();

  const notifications = notificationsData?.data?.slice(0, 4) ?? [];
  const conversations = conversationsData?.data?.slice(0, 4) ?? [];
  const searchHistory = historyData?.data ?? [];
  const trendingTopics = trendingData?.data.topics ?? [];

  const submitSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <aside className={styles.container}>
      <div className={styles.content}>
        <form
          className={styles.search}
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch(search);
          }}
        >
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search posts, people, ideas"
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search.trim() && (
            <button
              type="button"
              className={styles.searchReset}
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            className={styles.searchSubmit}
            disabled={!search.trim()}
          >
            Explore
          </button>
        </form>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Live inbox</p>
              <h2 className={styles.sectionTitle}>Active Chats</h2>
            </div>
            <Link href="/messages" className={styles.inlineLink}>
              Open
              <ArrowRight size={13} />
            </Link>
          </div>

          <ul className={styles.list}>
            {conversations.length === 0 && <li className={styles.empty}>No active conversations yet.</li>}
            {conversations.map((conversation) => (
              <li key={conversation.id} className={styles.row}>
                <Link href={`/messages?conversationId=${conversation.id}`} className={styles.rowLink}>
                  <div className={styles.rowIconWrap}>
                    {conversation.participant.avatar ? (
                      <Image
                        src={conversation.participant.avatar}
                        alt={conversation.participant.username}
                        className={styles.avatar}
                        width={40}
                        height={40}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {conversation.participant.username[0].toUpperCase()}
                      </div>
                    )}
                    {conversation.participant.isOnline && (
                      <span className={styles.onlineDot} aria-hidden="true" />
                    )}
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowTitle}>{conversation.participant.username}</span>
                    <span className={styles.rowSubtle}>
                      {getConversationPreview(conversation.lastMessage)}
                    </span>
                  </div>
                  <div className={styles.rowAside}>
                    <span className={styles.rowMetaPill}>
                      {timeAgoShort(new Date(conversation.updatedAt))}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <span className={styles.countBadge}>{conversation.unreadCount}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Creators</p>
              <h2 className={styles.sectionTitle}>Active Creators</h2>
            </div>
            <Sparkles size={14} className={styles.headerIcon} />
          </div>

          <ul className={styles.list}>
            {(trendingData?.data.creators ?? []).length === 0 && (
              <li className={styles.empty}>Creators will surface here as activity grows.</li>
            )}
            {(trendingData?.data.creators ?? []).map((creator) => (
              <li key={creator.id} className={styles.row}>
                <Link href={getProfilePath(creator)} className={styles.rowLink}>
                  <div className={styles.rowIconWrap}>
                    {creator.avatar ? (
                      <Image
                        src={creator.avatar}
                        alt={creator.username}
                        className={styles.avatar}
                        width={40}
                        height={40}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {creator.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowTitle}>{creator.username}</span>
                    <span className={styles.rowSubtle}>
                      {formatCompactCount(creator.count, "mention")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Signals</p>
              <h2 className={styles.sectionTitle}>Activity</h2>
            </div>
            <Bell size={14} className={styles.headerIcon} />
          </div>

          <ul className={styles.list}>
            {notifications.length === 0 && <li className={styles.empty}>No fresh activity right now.</li>}
            {notifications.map((notification) => (
              <li key={notification.id} className={styles.row}>
                <Link href="/notifications" className={styles.rowLink}>
                  <div className={styles.notificationIcon}>
                    <Bell size={14} />
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowTitle}>{notification.actor.username}</span>
                    <span className={styles.rowSubtle}>
                      {getNotificationSummary(notification.type)}{" "}
                      <span className={styles.metaDivider}>·</span>{" "}
                      {timeAgoShort(new Date(notification.createdAt))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Discovery</p>
              <h2 className={styles.sectionTitle}>Recent Searches</h2>
            </div>
            <button
              type="button"
              className={styles.inlineButton}
              onClick={() => clearSearchHistory()}
              disabled={searchHistory.length === 0 || clearingHistory}
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>

          <div className={styles.tagWrap}>
            {searchHistory.length === 0 && <span className={styles.emptyChip}>Your recent searches will show here.</span>}
            {searchHistory.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={styles.tag}
                onClick={() => submitSearch(entry.query)}
              >
                {entry.query}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Trending</p>
              <h2 className={styles.sectionTitle}>Trending Now</h2>
            </div>
            <Flame size={14} className={styles.headerIcon} />
          </div>

          <ul className={styles.list}>
            {trendingTopics.length === 0 && <li className={styles.empty}>Trending topics will appear as people post.</li>}
            {trendingTopics.map((topic) => (
              <li key={topic.label} className={styles.row}>
                <button
                  type="button"
                  className={styles.topicButton}
                  onClick={() => submitSearch(topic.searchValue)}
                >
                  <div className={styles.rowMeta}>
                    <span className={styles.rowTitle}>{topic.label}</span>
                    <span className={styles.rowSubtle}>
                      {formatCompactCount(topic.count, "mention")}
                    </span>
                  </div>
                  <Sparkles size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
