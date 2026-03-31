"use client";

import { useOptimistic, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Compass,
  MapPin,
  Search,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import Feed from "@/components/home/Feed/Feed";
import RightSideBar from "@/components/home/RightSideBar/RightSideBar";
import { formatHandle, getProfilePath } from "@/lib/profile";
import { useGetAllPost } from "@/query/HomeQuery";
import {
  useClearSearchHistory,
  useSearchHistory,
  useSearchPosts,
  useTrendingDiscovery,
  useSearchUsers,
} from "@/query/SearchQuery";
import { useFollowUser } from "@/query/ProfileQuery";
import { SearchUserResult } from "@/types/Types";
import styles from "./ExplorePage.module.scss";

const FEATURED_CATEGORIES = [
  { label: "Technology", value: "technology" },
  { label: "Design", value: "design" },
  { label: "Music", value: "music" },
  { label: "Gaming", value: "gaming" },
  { label: "Startups", value: "startups" },
];

export default function ExplorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const rawTab = searchParams.get("tab");
  const activeTab =
    rawTab === "people" || rawTab === "posts" ? rawTab : "top";
  const { data: postsData, isLoading: loadingFeed } = useGetAllPost();
  const { data: historyData } = useSearchHistory();
  const { data: trendingData } = useTrendingDiscovery();
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
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const posts = postsData?.data?.posts ?? [];
  const history = historyData?.data ?? [];
  const searchResults = searchData?.data.posts ?? [];
  const peopleResults = peopleData?.data.users ?? [];
  const activePosts = hasQuery ? searchResults : posts;

  const trendingTopics = trendingData?.data.topics ?? [];
  const topCreators = trendingData?.data.creators ?? [];
  const resultsCount =
    activeTab === "people"
      ? peopleResults.length
      : activeTab === "top" && hasQuery
        ? peopleResults.length + activePosts.length
        : activePosts.length;

  const submitQuery = (value: string, nextTab = activeTab) => {
    const trimmed = value.trim();
    setQuery(trimmed);
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
          <div className={styles.heroTop}>
            <div className={styles.heroCopy}>
              <div className={styles.heroLabelRow}>
                <p className={styles.eyebrow}>Explore</p>
                <span className={styles.livePill}>
                  <span className={styles.liveDot} aria-hidden="true" />
                  Updated live
                </span>
              </div>
              <h1 className={styles.title}>Discover what&apos;s moving</h1>
              <p className={styles.subtitle}>
                Find people, posts, and rising topics in one sharp discovery hub.
              </p>
            </div>
            <div className={styles.heroIcon}>
              <Compass size={22} />
            </div>
          </div>

          <div className={styles.searchShell}>
            <form
              className={styles.searchBar}
              onSubmit={(event) => {
                event.preventDefault();
                submitQuery(query, activeTab);
              }}
            >
              <span className={styles.searchIcon} aria-hidden="true">
                <Search size={18} />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search posts, people, or topics"
              />
              {hasQuery && (
                <button
                  type="button"
                  className={styles.searchReset}
                  aria-label="Clear search"
                  onClick={() => submitQuery("", activeTab)}
                >
                  <X size={16} />
                </button>
              )}
              <button type="submit" className={styles.searchSubmit}>
                Search
              </button>
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

            <div className={styles.categoryRow}>
              {FEATURED_CATEGORIES.map((category) => {
                const isActiveCategory =
                  trimmedQuery.toLowerCase() === category.value.toLowerCase();

                return (
                  <button
                    key={category.value}
                    type="button"
                    className={`${styles.categoryChip} ${isActiveCategory ? styles.categoryChipActive : ""}`}
                    onClick={() => submitQuery(category.value, "top")}
                  >
                    <span className={styles.categoryChipPrefix}>#</span>
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <section className={`${styles.panel} ${styles.historyPanel}`}>
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
          <div className={`${styles.panel} ${styles.discoveryPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Momentum</p>
                <h2 className={styles.panelTitle}>Trending topics</h2>
              </div>
              <span className={styles.panelMeta}>
                <Sparkles size={14} />
                {trendingTopics.length || "No"} live topics
              </span>
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
                  <div className={styles.topicMeta}>
                    <span className={styles.topicTag}>Topic</span>
                    <span className={styles.topicCount}>
                      {formatCompactCount(topic.count)} mentions
                    </span>
                  </div>
                  <strong>{topic.label}</strong>
                  <span>Jump into the conversation</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`${styles.panel} ${styles.discoveryPanel}`}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Creators</p>
                <h2 className={styles.panelTitle}>Fresh voices</h2>
              </div>
              <span className={styles.panelMeta}>
                <UsersRound size={14} />
                {topCreators.length || "No"} creators
              </span>
            </div>
            <div className={styles.creatorList}>
              {topCreators.length === 0 && <p className={styles.emptyText}>Creators will appear as posts arrive.</p>}
              {topCreators.map((creator) => (
                <button key={creator.id} type="button" className={styles.creatorCard} onClick={() => router.push(getProfilePath(creator))}>
                  {creator.avatar ? (
                    <Image
                      src={creator.avatar}
                      alt={creator.username}
                      className={styles.creatorAvatar}
                      width={42}
                      height={42}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.creatorFallback}>{creator.username[0].toUpperCase()}</div>
                  )}
                  <div className={styles.creatorCopy}>
                    <div className={styles.creatorNameRow}>
                      <strong>{creator.username}</strong>
                      {creator.handle && (
                        <span>{formatHandle(creator.handle)}</span>
                      )}
                    </div>
                    <span>{formatCompactCount(creator.count)} recent posts</span>
                  </div>
                  <span className={styles.creatorArrow} aria-hidden="true">
                    <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.resultsSection}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>{hasQuery ? "Search results" : "Feed snapshot"}</p>
              <h2 className={styles.panelTitle}>
                {hasQuery ? `Results for “${trimmedQuery}”` : "Latest posts"}
              </h2>
            </div>
            <span className={styles.resultsMeta}>
              {resultsCount} {resultsCount === 1 ? "result" : "results"}
            </span>
          </div>

          {!hasQuery && activeTab === "people" && (
            <div className={styles.stateBlock}>
              Search for a name, bio keyword, or location to discover people.
            </div>
          )}

          {hasQuery && activeTab !== "posts" && (
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
                {peopleResults.map((person, index) => (
                  <div
                    key={person.id}
                    className={styles.peopleGridItem}
                    style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
                  >
                    <PersonSearchCard person={person} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab !== "people" && hasQuery && loadingSearch && <div className={styles.stateBlock}>Searching...</div>}
          {activeTab !== "people" && hasQuery && searchError && <div className={styles.stateBlock}>{searchError.message}</div>}
          {!hasQuery && loadingFeed && <div className={styles.stateBlock}>Loading the latest posts...</div>}
          {activeTab !== "people" && !loadingSearch && !loadingFeed && activePosts.length === 0 && (
            <div className={styles.stateBlock}>
              {hasQuery ? "No posts matched that search yet." : "No posts to explore yet."}
            </div>
          )}

          {activeTab !== "people" && (
            <div className={styles.resultsFeed}>
              {activePosts.map((post, index) => (
                <div
                  key={`${post.feedEventId ?? post.id}-${query}`}
                  className={styles.resultItem}
                  style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
                >
                  <Feed data={post} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <RightSideBar />
    </section>
  );
}

function PersonSearchCard({ person }: { person: SearchUserResult }) {
  const router = useRouter();
  const { mutate: followUser, isPending } = useFollowUser(person.id);
  const [isFollowing, setIsFollowing] = useOptimistic(person.isFollowing);

  const canMessage = person.followsYou || isFollowing;
  const handleText = formatHandle(person.handle);

  return (
    <article className={styles.personCard}>
      <button
        type="button"
        className={styles.personCardLink}
        onClick={() => router.push(getProfilePath(person))}
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
            <Image
              src={person.avatar}
              alt={person.username}
              className={styles.personAvatar}
              width={58}
              height={58}
              unoptimized
            />
          ) : (
            <div className={styles.personAvatarFallback}>
              {person.username[0].toUpperCase()}
            </div>
          )}
          <div className={styles.personCopy}>
            <div className={styles.personIdentity}>
              <div>
                <div className={styles.personNameRow}>
                  <strong>{person.username}</strong>
                  {person.isVerified && <CheckCircle2 size={14} />}
                </div>
                {handleText && (
                  <p className={styles.personHandle}>{handleText}</p>
                )}
              </div>
              <span className={styles.personStatsPill}>
                {formatCompactCount(person._count.followers)} followers
              </span>
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
              <span>
                <strong>{formatCompactCount(person._count.posts)}</strong> posts
              </span>
              <span>
                <strong>{formatCompactCount(person._count.following)}</strong>{" "}
                following
              </span>
            </div>
          </div>
        </div>
      </button>
      <div className={styles.personActions}>
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
            className={styles.personAction}
            onClick={() => router.push(`/messages?userId=${person.id}`)}
          >
            Message
          </button>
        )}
        <button
          type="button"
          className={styles.personActionSecondary}
          onClick={() => router.push(getProfilePath(person))}
        >
          View profile
        </button>
      </div>
    </article>
  );
}

function formatCompactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
