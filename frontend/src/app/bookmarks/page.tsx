"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Feed from "@/components/home/Feed/Feed";
import RightSideBar from "@/components/home/RightSideBar/RightSideBar";
import { useInfiniteBookmarkedPosts } from "@/query/HomeQuery";
import styles from "./BookmarksPage.module.scss";

export default function BookmarksPage() {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteBookmarkedPosts();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const posts = data?.pages.flatMap((page) => page.data.posts) ?? [];

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Bookmarks</p>
          <h1 className={styles.title}>Saved for later</h1>
          <p className={styles.subtitle}>
            Keep the posts you want to revisit, reference, or reply to when you
            have more time.
          </p>
        </header>

        {isLoading && (
          <div className={styles.loadingStack}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className={styles.empty}>
            <h2>No bookmarks yet</h2>
            <p>
              Save posts from the feed to build your own reading list and
              inspiration board.
            </p>
            <Link href="/explore" className={styles.emptyLink}>
              Explore posts
            </Link>
          </div>
        )}

        {!isLoading &&
          posts.map((post) => (
            <Feed key={post.feedEventId ?? post.id} data={post} />
          ))}

        <div ref={loadMoreRef} className={styles.loadMoreTrigger} />

        {isFetchingNextPage && (
          <div className={styles.loadingStack}>
            {[...Array(2)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}
      </main>

      <RightSideBar />
    </section>
  );
}
