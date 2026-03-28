"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Compass, MapPin, Search, Sparkles, Trash2 } from "lucide-react";
import Feed from "@/components/home/Feed/Feed";
import RightSideBar from "@/components/home/RightSideBar/RightSideBar";
import { useGetAllPost } from "@/query/HomeQuery";
import {
  useClearSearchHistory,
  useSearchHistory,
  useSearchPosts,
  useSearchUsers,
} from "@/query/SearchQuery";
import { useFollowUser } from "@/query/ProfileQuery";
import { SearchUserResult } from "@/types/Types";
import styles from "./ExplorePage.module.scss";

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

  const counts = new Map<string, number>();

  contents.forEach((content) => {
    content
      .toLowerCase()
      .match(/#?[a-z0-9]{4,}/g)
      ?.filter((token) => !ignore.has(token.replace(/^#/, "")))
      .forEach((token) => {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      });
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([token, count]) => ({
      label: token.startsWith("#") ? token : `#${token}`,
      searchValue: token.replace(/^#/, ""),
      count,
    }));
};

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const rawTab = searchParams.get("tab");
  const activeTab =
    rawTab === "people" || rawTab === "posts" ? rawTab : "top";
  const { data: postsData, isLoading: loadingFeed } = useGetAllPost();
  const { data: historyData } = useSearchHistory();
  const { mutate: clearSearchHistory, isPending: clearingHistory } =
    useClearSearchHistory();
  const {
    data: searchData,
    isLoading: loadingSearch,
    error: searchError,
  } = useSearchPosts(query);
  const {
    data: peopleData,
    isLoading: loadingPeople,
    error: peopleError,
  } = useSearchUsers(query);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const posts = postsData?.data?.posts ?? [];
  const history = historyData?.data ?? [];
  const searchResults = searchData?.data.posts ?? [];
  const peopleResults = peopleData?.data.users ?? [];
  const activePosts = query.trim() ? searchResults : posts;

  const trendingTopics = useMemo(
    () => buildTrendingTopics(posts.map((post) => post.content).filter(Boolean)),
    [posts],
  );

  const topCreators = useMemo(() => {
    const creators = new Map<string, { id: string; username: string; avatar?: string; count: number }>();

    posts.forEach((post) => {
      const existing = creators.get(post.user.id);
      creators.set(post.user.id, {
        id: post.user.id,
        username: post.user.username,
        avatar: post.user.avatar,
        count: (existing?.count ?? 0) + 1,
      });
    });

    return [...creators.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [posts]);

  const submitQuery = (value: string, nextTab = activeTab) => {
    const trimmed = value.trim();
    const tabParam = nextTab === "top" ? "" : `&tab=${nextTab}`;
    router.push(
      trimmed
        ? `/explore?q=${encodeURIComponent(trimmed)}${tabParam}`
        : `/explore${tabParam ? `?tab=${nextTab}` : ""}`,
    );
  };

  return (
    <section className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Explore</p>
            <h1 className={styles.title}>Search, signals, and fresh conversations</h1>
            <p className={styles.subtitle}>
              Use Explore to search posts, revisit your recent queries, and spot what is gaining momentum across the app.
            </p>
          </div>
          <div className={styles.heroIcon}>
            <Compass size={24} />
          </div>
        </header>

        <form
          className={styles.searchBar}
          onSubmit={(event) => {
            event.preventDefault();
            submitQuery(query, activeTab);
          }}
        >
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts or usernames"
          />
          <button type="submit">Search</button>
        </form>

        <div className={styles.tabRow}>
          {[
            { id: "top", label: "Top" },
            { id: "people", label: "People" },
            { id: "posts", label: "Posts" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
              onClick={() => submitQuery(query, tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Recent</p>
              <h2 className={styles.panelTitle}>Search history</h2>
            </div>
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => clearSearchHistory()}
              disabled={history.length === 0 || clearingHistory}
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
          <div className={styles.chipWrap}>
            {history.length === 0 && <span className={styles.emptyChip}>Your recent searches will land here.</span>}
            {history.map((entry) => (
              <button key={entry.id} type="button" className={styles.chip} onClick={() => submitQuery(entry.query)}>
                {entry.query}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.discoveryGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Momentum</p>
                <h2 className={styles.panelTitle}>Trending topics</h2>
              </div>
              <Sparkles size={14} className={styles.panelIcon} />
            </div>
            <div className={styles.topicList}>
              {trendingTopics.length === 0 && <p className={styles.emptyText}>Trending terms appear as new posts come in.</p>}
              {trendingTopics.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  className={styles.topicCard}
                  onClick={() => submitQuery(topic.searchValue)}
                >
                  <strong>{topic.label}</strong>
                  <span>{topic.count} recent mentions</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Creators</p>
                <h2 className={styles.panelTitle}>Fresh voices</h2>
              </div>
            </div>
            <div className={styles.creatorList}>
              {topCreators.length === 0 && <p className={styles.emptyText}>Creators will appear as posts arrive.</p>}
              {topCreators.map((creator) => (
                <button key={creator.id} type="button" className={styles.creatorCard} onClick={() => router.push(`/profile/${creator.id}`)}>
                  {creator.avatar ? (
                    <img src={creator.avatar} alt={creator.username} className={styles.creatorAvatar} />
                  ) : (
                    <div className={styles.creatorFallback}>{creator.username[0].toUpperCase()}</div>
                  )}
                  <div>
                    <strong>{creator.username}</strong>
                    <span>{creator.count} recent posts</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.resultsSection}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{query.trim() ? "Search results" : "Feed snapshot"}</p>
              <h2 className={styles.panelTitle}>
                {query.trim() ? `Results for “${query.trim()}”` : "Latest posts"}
              </h2>
            </div>
          </div>

          {!query.trim() && activeTab === "people" && (
            <div className={styles.stateBlock}>
              Search for a name, bio keyword, or location to discover people.
            </div>
          )}

          {query.trim() && activeTab !== "posts" && (
            <section className={styles.peopleSection}>
              <div className={styles.peopleHeader}>
                <div>
                  <p className={styles.panelEyebrow}>People</p>
                  <h3 className={styles.peopleTitle}>People matching this search</h3>
                </div>
              </div>

              {loadingPeople && <div className={styles.stateBlock}>Looking for people...</div>}
              {!loadingPeople && peopleError && (
                <div className={styles.stateBlock}>{peopleError.message}</div>
              )}
              {!loadingPeople && !peopleError && peopleResults.length === 0 && (
                <div className={styles.stateBlock}>No people matched that search yet.</div>
              )}

              <div className={styles.peopleGrid}>
                {peopleResults.map((person) => (
                  <PersonSearchCard key={person.id} person={person} />
                ))}
              </div>
            </section>
          )}

          {activeTab !== "people" && query.trim() && loadingSearch && <div className={styles.stateBlock}>Searching...</div>}
          {activeTab !== "people" && query.trim() && searchError && <div className={styles.stateBlock}>{searchError.message}</div>}
          {!query.trim() && loadingFeed && <div className={styles.stateBlock}>Loading the latest posts...</div>}
          {activeTab !== "people" && !loadingSearch && !loadingFeed && activePosts.length === 0 && (
            <div className={styles.stateBlock}>
              {query.trim() ? "No posts matched that search yet." : "No posts to explore yet."}
            </div>
          )}

          {activeTab !== "people" &&
            activePosts.map((post) => (
              <Feed key={`${post.feedEventId ?? post.id}-${query}`} data={post} />
            ))}
        </section>
      </main>

      <RightSideBar />
    </section>
  );
}

function PersonSearchCard({ person }: { person: SearchUserResult }) {
  const router = useRouter();
  const { mutate: followUser, isPending } = useFollowUser(person.id);
  const [isFollowing, setIsFollowing] = useState(person.isFollowing);

  useEffect(() => {
    setIsFollowing(person.isFollowing);
  }, [person.isFollowing]);

  const canMessage = person.followsYou || isFollowing;

  return (
    <article className={styles.personCard}>
      <button
        type="button"
        className={styles.personCardLink}
        onClick={() => router.push(`/profile/${person.id}`)}
      >
        <div
          className={styles.personBanner}
          style={
            person.headerPhoto
              ? { backgroundImage: `url(${person.headerPhoto})` }
              : undefined
          }
        />
        <div className={styles.personBody}>
          {person.avatar ? (
            <img
              src={person.avatar}
              alt={person.username}
              className={styles.personAvatar}
            />
          ) : (
            <div className={styles.personAvatarFallback}>
              {person.username[0].toUpperCase()}
            </div>
          )}
          <div className={styles.personCopy}>
            <div className={styles.personNameRow}>
              <strong>{person.username}</strong>
              {person.isVerified && <CheckCircle2 size={14} />}
            </div>
            <p className={styles.personBio}>{person.bio || "No bio yet."}</p>
            <div className={styles.personMeta}>
              {person.location && (
                <span>
                  <MapPin size={12} />
                  {person.location}
                </span>
              )}
              {person.followsYou && (
                <span className={styles.relationshipPill}>Follows you</span>
              )}
              {isFollowing && (
                <span className={styles.relationshipPill}>You follow</span>
              )}
            </div>
            <div className={styles.personStats}>
              <span>{person._count.followers} followers</span>
              <span>{person._count.posts} posts</span>
            </div>
          </div>
        </div>
      </button>
      <div className={styles.personActions}>
        <button
          type="button"
          className={styles.personAction}
          onClick={() => router.push(`/profile/${person.id}`)}
        >
          View profile
        </button>
        <button
          type="button"
          className={styles.personActionPrimary}
          onClick={() => {
            const previous = isFollowing;
            setIsFollowing(!previous);
            followUser(undefined, {
              onError: () => setIsFollowing(previous),
            });
          }}
          disabled={isPending}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </button>
        {canMessage && (
          <button
            type="button"
            className={styles.personActionSecondary}
            onClick={() => router.push(`/messages?userId=${person.id}`)}
          >
            Message
          </button>
        )}
      </div>
    </article>
  );
}
