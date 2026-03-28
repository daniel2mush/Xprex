"use client";
import styles from "./Feed.module.scss";
import { timeAgoShort } from "@/lib/ParseDate";
import {
  Bookmark,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
} from "lucide-react";
import { useOptimistic, useState } from "react";
import Link from "next/link";
import { PostTypes } from "@/types/Types";
import PostModal from "@/components/postModal/PostModal";
import MediaViewer from "@/components/mediaViewer/MediaViewer";
import RepostDialog from "@/components/repostDialog/RepostDialog";
import {
  useTogglePostBookmark,
  useTogglePostLike,
  useTogglePostRepost,
} from "@/query/HomeQuery";

export default function Feed({ data }: { data: PostTypes }) {
  const [showModal, setShowModal] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showRepostDialog, setShowRepostDialog] = useState(false);

  const { mutate: toggleLike, isPending: isTogglingLike } = useTogglePostLike();
  const { mutate: toggleBookmark, isPending: isTogglingBookmark } =
    useTogglePostBookmark();
  const { mutate: toggleRepost, isPending: isTogglingRepost } =
    useTogglePostRepost();

  const baseState = {
    liked: data.isLiked ?? false,
    bookmarked: data.isBookmarked ?? false,
    reposted: data.isReposted ?? false,
    likeCount: data._count?.likes ?? 0,
    repostCount: data._count?.reposts ?? 0,
  };

  const [optimisticState, setOptimisticState] = useOptimistic(
    baseState,
    (
      currentState,
      patch: Partial<typeof baseState>,
    ) => ({
      ...currentState,
      ...patch,
    }),
  );

  const { liked, bookmarked, reposted, likeCount, repostCount } =
    optimisticState;

  const mediaItems = data.media ?? [];
  const mediaCount = Math.min(mediaItems.length, 4);

  const handleLike = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (isTogglingLike) return;

    const previousState = optimisticState;
    const nextLiked = !liked;

    setOptimisticState({
      liked: nextLiked,
      likeCount: Math.max(0, likeCount + (nextLiked ? 1 : -1)),
    });

    toggleLike(data.id, {
      onSuccess: (response) => {
        setOptimisticState({
          liked: response.data.liked,
          likeCount: response.data.likesCount,
        });
      },
      onError: () => {
        setOptimisticState(previousState);
      },
    });
  };

  const handleBookmark = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (isTogglingBookmark) return;

    const previousState = optimisticState;
    const nextBookmarked = !bookmarked;
    setOptimisticState({ bookmarked: nextBookmarked });

    toggleBookmark(data.id, {
      onSuccess: (response) => {
        setOptimisticState({ bookmarked: response.data.bookmarked });
      },
      onError: () => {
        setOptimisticState(previousState);
      },
    });
  };

  const handleConfirmRepost = () => {
    if (isTogglingRepost) return;

    const previousState = optimisticState;
    const nextReposted = !reposted;

    setOptimisticState({
      reposted: nextReposted,
      repostCount: Math.max(0, repostCount + (nextReposted ? 1 : -1)),
    });

    toggleRepost(data.id, {
      onSuccess: (response) => {
        setOptimisticState({
          reposted: response.data.reposted,
          repostCount: response.data.repostsCount,
        });
        setShowRepostDialog(false);
      },
      onError: () => {
        setOptimisticState(previousState);
      },
    });
  };

  const handleArticleClick = (
    event: React.MouseEvent<HTMLElement | HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, textarea, input, video")) return;
    setShowModal(true);
  };

  return (
    <>
      <article className={styles.container} onClick={handleArticleClick}>
        <div className={styles.header}>
          <Link
            href={`/profile/${data.user.id}`}
            className={styles.avatarLink}
            onClick={(event) => event.stopPropagation()}
          >
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
            <Link
              href={`/profile/${data.user.id}`}
              className={styles.nameLink}
              onClick={(event) => event.stopPropagation()}
            >
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

          <button className={styles.moreBtn} aria-label="More options" type="button">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {data.content && <p className={styles.body}>{data.content}</p>}

        {mediaCount > 0 && (
          <div className={styles.mediaGrid} data-count={mediaCount}>
            {mediaItems.slice(0, 4).map((media, index) => (
              <button
                key={media.id}
                type="button"
                className={styles.mediaItem}
                data-index={index}
                data-count={mediaCount}
                onClick={(event) => {
                  event.stopPropagation();
                  setViewerIndex(index);
                }}
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
                    preload="metadata"
                    className={styles.mediaVideo}
                  />
                ) : null}
                <span className={styles.mediaHint}>
                  <ImageIcon size={13} />
                  View full media
                </span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            <button
              className={`${styles.actionBtn} ${liked ? styles.liked : ""}`}
              onClick={handleLike}
              aria-label={liked ? "Unlike" : "Like"}
              aria-pressed={liked}
              disabled={isTogglingLike}
              type="button"
            >
              <Heart size={16} className={liked ? styles.heartFilled : ""} />
              {likeCount > 0 && <span>{formatCount(likeCount)}</span>}
            </button>

            <button
              className={`${styles.actionBtn} ${styles.commentBtn}`}
              aria-label="Open post replies"
              onClick={(event) => {
                event.stopPropagation();
                setShowModal(true);
              }}
              type="button"
            >
              <MessageCircle size={16} />
              {(data._count?.comments ?? 0) > 0 && (
                <span>{formatCount(data._count.comments)}</span>
              )}
            </button>

            <button
              className={`${styles.actionBtn} ${styles.repostBtn} ${reposted ? styles.reposted : ""}`}
              aria-label={reposted ? "Undo repost" : "Repost"}
              onClick={(event) => {
                event.stopPropagation();
                setShowRepostDialog(true);
              }}
              type="button"
            >
              <Repeat2 size={16} />
              {repostCount > 0 && <span>{formatCount(repostCount)}</span>}
            </button>
          </div>

          <button
            className={`${styles.bookmarkBtn} ${bookmarked ? styles.bookmarked : ""}`}
            onClick={handleBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            aria-pressed={bookmarked}
            disabled={isTogglingBookmark}
            type="button"
          >
            <Bookmark
              size={16}
              className={bookmarked ? styles.bookmarkFilled : ""}
            />
          </button>
        </div>
      </article>

      {showModal && <PostModal post={data} onClose={() => setShowModal(false)} />}

      {viewerIndex !== null && (
        <MediaViewer
          items={mediaItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {showRepostDialog && (
        <RepostDialog
          reposted={reposted}
          username={data.user.username}
          onClose={() => setShowRepostDialog(false)}
          onConfirm={handleConfirmRepost}
          isPending={isTogglingRepost}
        />
      )}
    </>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
