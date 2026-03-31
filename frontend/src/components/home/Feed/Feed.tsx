"use client";
import styles from "./Feed.module.scss";
import { timeAgoShort } from "@/lib/ParseDate";
import {
  Check,
  Pencil,
  Bookmark,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useOptimistic, useRef, useState } from "react";
import Link from "next/link";
import { PostTypes } from "@/types/Types";
import PostModal from "@/components/postModal/PostModal";
import MediaViewer from "@/components/mediaViewer/MediaViewer";
import RepostDialog from "@/components/repostDialog/RepostDialog";
import {
  useTogglePostBookmark,
  useDeletePost,
  useUpdatePost,
  useTogglePostLike,
  useTogglePostRepost,
} from "@/query/HomeQuery";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { formatHandle, getProfilePath } from "@/lib/profile";

export default function Feed({
  data,
  showAuthorActions = false,
}: {
  data: PostTypes;
  showAuthorActions?: boolean;
}) {
  const { user } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showRepostDialog, setShowRepostDialog] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(data.content ?? "");
  const menuRef = useRef<HTMLDivElement>(null);

  const { mutate: toggleLike, isPending: isTogglingLike } = useTogglePostLike();
  const { mutate: toggleBookmark, isPending: isTogglingBookmark } =
    useTogglePostBookmark();
  const { mutate: toggleRepost, isPending: isTogglingRepost } =
    useTogglePostRepost();
  const { mutate: deletePost, isPending: isDeletingPost } = useDeletePost();
  const { mutate: updatePost, isPending: isUpdatingPost } = useUpdatePost();

  const baseState = {
    liked: data.isLiked ?? false,
    bookmarked: data.isBookmarked ?? false,
    reposted: data.isReposted ?? false,
    likeCount: data._count?.likes ?? 0,
    repostCount: data._count?.reposts ?? 0,
  };

  const [optimisticState, setOptimisticState] = useOptimistic(
    baseState,
    (currentState, patch: Partial<typeof baseState>) => ({
      ...currentState,
      ...patch,
    }),
  );

  const { liked, bookmarked, reposted, likeCount, repostCount } =
    optimisticState;
  const canManagePost = showAuthorActions && user?.id === data.user.id;

  const mediaItems = data.media ?? [];
  const mediaCount = Math.min(mediaItems.length, 4);
  const commentCount = data._count?.comments ?? 0;
  const displayTimestamp = data.feedCreatedAt ?? data.createdAt;
  const timestampDate = displayTimestamp ? new Date(displayTimestamp) : null;
  const hasTimestamp =
    timestampDate !== null && !Number.isNaN(timestampDate.getTime());
  const handleText = formatHandle(data.user.handle);
  const timeLabel =
    hasTimestamp && timestampDate ? timeAgoShort(timestampDate) : "";

  useEffect(() => {
    if (!showActionsMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showActionsMenu]);

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

  const handleDeletePost = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!window.confirm("Delete this post? This action cannot be undone.")) {
      return;
    }

    deletePost(data.id, {
      onSuccess: (response) => {
        toast.success(response.message ?? "Post deleted");
        setShowActionsMenu(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  const handleSaveEdit = () => {
    const nextContent = editContent.trim();

    if (nextContent.length < 1) {
      toast.error("Post content cannot be empty");
      return;
    }

    updatePost(
      { postId: data.id, content: nextContent },
      {
        onSuccess: (response) => {
          toast.success(response.message ?? "Post updated");
          setIsEditing(false);
          setShowActionsMenu(false);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <>
      <article className={styles.container} onClick={handleArticleClick}>
        {data.repostedBy && (
          <div className={styles.repostBanner}>
            <Repeat2 size={14} />
            <span>{data.repostedBy.username} reposted</span>
          </div>
        )}

        <div className={styles.header}>
          <Link
            href={getProfilePath(data.user)}
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
              href={getProfilePath(data.user)}
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
            <div className={styles.metaRow}>
              {handleText && (
                <span className={styles.handle}>{handleText}</span>
              )}
              {handleText && timeLabel && (
                <span className={styles.metaDot} aria-hidden="true" />
              )}
              {timeLabel && timestampDate && (
                <time
                  className={styles.timestamp}
                  dateTime={timestampDate.toISOString()}
                >
                  {timeLabel}
                </time>
              )}
            </div>
          </div>

          {canManagePost && (
            <div className={styles.moreWrap} ref={menuRef}>
              <button
                className={styles.moreBtn}
                aria-label="Post options"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowActionsMenu((current) => !current);
                }}
              >
                <MoreHorizontal size={16} />
              </button>

              {showActionsMenu && (
                <div
                  className={styles.actionsMenu}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.menuItem}
                    onClick={() => {
                      setEditContent(data.content ?? "");
                      setIsEditing(true);
                      setShowActionsMenu(false);
                    }}
                  >
                    <Pencil size={14} />
                    Edit post
                  </button>
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={handleDeletePost}
                    disabled={isDeletingPost}
                  >
                    <Trash2 size={14} />
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.streamBody}>
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
            <div className={styles.actionRail}>
              <button
                className={`${styles.actionBtn} ${styles.commentBtn}`}
                aria-label="Open post replies"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowModal(true);
                }}
                type="button"
              >
                <MessageCircle size={15} />
                <span className={styles.actionLabel}>Reply</span>
                {commentCount > 0 && (
                  <span className={styles.actionCount}>
                    {formatCount(commentCount)}
                  </span>
                )}
              </button>

              <button
                className={`${styles.actionBtn} ${liked ? styles.liked : ""}`}
                onClick={handleLike}
                aria-label={liked ? "Unlike" : "Like"}
                aria-pressed={liked}
                disabled={isTogglingLike}
                type="button"
              >
                <Heart size={15} className={liked ? styles.heartFilled : ""} />
                <span className={styles.actionLabel}>Like</span>
                {likeCount > 0 && (
                  <span className={styles.actionCount}>
                    {formatCount(likeCount)}
                  </span>
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
                <Repeat2 size={15} />
                <span className={styles.actionLabel}>Repost</span>
                {repostCount > 0 && (
                  <span className={styles.actionCount}>
                    {formatCount(repostCount)}
                  </span>
                )}
              </button>
            </div>

            <button
              className={`${styles.actionBtn} ${styles.bookmarkBtn} ${bookmarked ? styles.bookmarked : ""}`}
              onClick={handleBookmark}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              aria-pressed={bookmarked}
              disabled={isTogglingBookmark}
              type="button"
            >
              <Bookmark
                size={15}
                className={bookmarked ? styles.bookmarkFilled : ""}
              />
              <span className={styles.actionLabel}>Save</span>
            </button>
          </div>
        </div>
      </article>

      {showModal && (
        <PostModal post={data} onClose={() => setShowModal(false)} />
      )}

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

      {isEditing && (
        <div
          className={styles.editOverlay}
          onClick={() => setIsEditing(false)}
          role="presentation"
        >
          <div
            className={styles.editDialog}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.editHeader}>
              <div>
                <p className={styles.editEyebrow}>Edit post</p>
                <h3 className={styles.editTitle}>Update your post</h3>
              </div>
              <button
                type="button"
                className={styles.editClose}
                aria-label="Close edit dialog"
                onClick={() => setIsEditing(false)}
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              className={styles.editTextarea}
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              rows={6}
            />

            <div className={styles.editActions}>
              <button
                type="button"
                className={styles.editSecondary}
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.editPrimary}
                onClick={handleSaveEdit}
                disabled={isUpdatingPost}
              >
                <Check size={14} />
                {isUpdatingPost ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
