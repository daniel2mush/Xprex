"use client";

import styles from "./RightSideBar.module.scss";
import Link from "next/link";
import { getProfilePath } from "@/lib/profile";
import { useState } from "react";
import { ArrowRight, Bell, Flame, Search, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetNotifications } from "@/query/NotificationsQuery";
import { useGetConversations } from "@/query/MessagingQuery";
import {
  useClearSearchHistory,
  useSearchHistory,
  useTrendingDiscovery,
} from "@/query/SearchQuery";
import { timeAgoShort } from "@/lib/ParseDate";

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
              <p className={styles.eyebrow}>Creators</p>
              <h2 className={styles.sectionTitle}>Active voices</h2>
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
                      <img
                        src={creator.avatar}
                        alt={creator.username}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {creator.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowTitle}>{creator.username}</span>
                    <span className={styles.rowSubtle}>{creator.count} recent posts</span>
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
