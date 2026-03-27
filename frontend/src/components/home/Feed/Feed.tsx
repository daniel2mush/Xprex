"use client";
import styles from "./Feed.module.scss";
import { timeAgoShort } from "@/lib/ParseDate";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { PostTypes } from "@/types/Types";
import { useRouter } from "next/navigation";
import PostModal from "@/components/postModal/PostModal";

export default function Feed({ data }: { data: PostTypes }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const [liked, setLiked] = useState(data.isLiked ?? false);
  const [bookmarked, setBookmarked] = useState(data.isBookmarked ?? false);
  const [likeCount, setLikeCount] = useState(data._count?.likes ?? 0);

  const mediaItems = data.media ?? [];
  const mediaCount = Math.min(mediaItems.length, 4); // cap at 4

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    // TODO: call mutation
  };

  const handleBookmark = () => {
    setBookmarked((prev) => !prev);
    // TODO: call mutation
  };

  return (
    <>
      <article className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href={`/profile/${data.user.id}`} className={styles.avatarLink}>
            {data.user.avatar ? (
              <img
                src={data.user.avatar}
                alt={data.user.username}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {data.user.username[0].toUpperCase()}
              </div>
            )}
          </Link>

          <div className={styles.userInfo}>
            <Link href={`/profile/${data.user.id}`} className={styles.nameLink}>
              <span className={styles.username}>{data.user.username}</span>
              {data.user.isVerified && (
                <span className={styles.verified} aria-label="Verified">
                  ✓
                </span>
              )}
            </Link>
            <span className={styles.meta}>
              @{data.user.username} · {timeAgoShort(data.createdAt as Date)}
            </span>
          </div>

          <button className={styles.moreBtn} aria-label="More options">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Content */}
        {data.content && <p className={styles.body}>{data.content}</p>}

        {/* Media */}
        {mediaCount > 0 && (
          <div className={styles.mediaGrid} data-count={mediaCount}>
            {mediaItems.slice(0, 4).map((media, i) => (
              <div
                key={media.id}
                className={styles.mediaItem}
                data-index={i}
                data-count={mediaCount}
              >
                {media.type === "IMAGE" || media.type === "GIF" ? (
                  <img
                    src={media.url}
                    alt={media.alt ?? "Post image"}
                    loading="lazy"
                    className={styles.mediaImg}
                  />
                ) : media.type === "VIDEO" ? (
                  <video
                    src={media.url}
                    controls
                    preload="metadata"
                    className={styles.mediaVideo}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            <button
              className={`${styles.actionBtn} ${liked ? styles.liked : ""}`}
              onClick={handleLike}
              aria-label={liked ? "Unlike" : "Like"}
              aria-pressed={liked}
            >
              <Heart size={16} className={liked ? styles.heartFilled : ""} />
              {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
            </button>

            <button
              className={`${styles.actionBtn} ${styles.commentBtn}`}
              aria-label="Comment"
              onClick={() => setShowModal(true)}
            >
              <MessageCircle size={16} />
              {(data._count?.comments ?? 0) > 0 && (
                <span>{formatCount(data._count!.comments)}</span>
              )}
            </button>

            <button
              className={`${styles.actionBtn} ${styles.repostBtn}`}
              aria-label="Repost"
            >
              <Repeat2 size={16} />
            </button>
          </div>

          <button
            className={`${styles.bookmarkBtn} ${bookmarked ? styles.bookmarked : ""}`}
            onClick={handleBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            aria-pressed={bookmarked}
          >
            <Bookmark
              size={16}
              className={bookmarked ? styles.bookmarkFilled : ""}
            />
          </button>
        </div>
      </article>
      {showModal && (
        <PostModal post={data} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
