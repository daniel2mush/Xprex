"use client";

import styles from "./RightSideBar.module.scss";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Bell, Flame, Search, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetNotifications } from "@/query/NotificationsQuery";
import { useGetConversations } from "@/query/MessagingQuery";
import { useGetAllPost } from "@/query/HomeQuery";
import { useClearSearchHistory, useSearchHistory } from "@/query/SearchQuery";
import { timeAgoShort } from "@/lib/ParseDate";

const buildTrendingTopics = (contents: string[]) => {
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

  const frequencies = new Map<string, number>();

  for (const content of contents) {
    const tokens = content
      .toLowerCase()
      .match(/#?[a-z0-9]{4,}/g)
      ?.filter((token) => !ignore.has(token));

    tokens?.forEach((token) => {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    });
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([token, count]) => ({
      label: token.startsWith("#") ? token : `#${token}`,
      searchValue: token.replace(/^#/, ""),
      count,
    }));
};

export default function RightSideBar() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: notificationsData } = useGetNotifications();
  const { data: conversationsData } = useGetConversations();
  const { data: postsData } = useGetAllPost();
  const { data: historyData } = useSearchHistory();
  const { mutate: clearSearchHistory, isPending: clearingHistory } =
    useClearSearchHistory();

  const notifications = notificationsData?.data?.slice(0, 4) ?? [];
  const conversations = conversationsData?.data?.slice(0, 4) ?? [];
  const searchHistory = historyData?.data ?? [];
  const posts = postsData?.data?.posts ?? [];

  const trendingTopics = useMemo(
    () => buildTrendingTopics(posts.map((post) => post.content).filter(Boolean)),
    [posts],
  );

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
        </form>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Live inbox</p>
              <h2 className={styles.sectionTitle}>Conversation pulse</h2>
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
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowTitle}>{conversation.participant.username}</span>
                    <span className={styles.rowSubtle}>
                      {conversation.lastMessage?.content ?? "Start the conversation"}
                    </span>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className={styles.countBadge}>{conversation.unreadCount}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Signals</p>
              <h2 className={styles.sectionTitle}>Recent activity</h2>
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
                    <span className={styles.rowSubtle}>{timeAgoShort(new Date(notification.createdAt))}</span>
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
              <h2 className={styles.sectionTitle}>Search history</h2>
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
              <p className={styles.eyebrow}>Feed energy</p>
              <h2 className={styles.sectionTitle}>Trending now</h2>
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
                    <span className={styles.rowSubtle}>{topic.count} mentions in recent posts</span>
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
