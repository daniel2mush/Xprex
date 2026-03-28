"use client";
import styles from "./PostModal.module.scss";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Heart, Repeat2, Bookmark } from "lucide-react";
import { PostTypes } from "@/types/Types";
import { useGetComments, useCreateComment } from "@/query/CommentQuery";
import { Button } from "@/ui/Buttons/Buttons";
import { useUserStore } from "@/store/userStore";
import { useState } from "react";
import Link from "next/link";
import Comment from "../comments/Comment";
import MediaViewer from "@/components/mediaViewer/MediaViewer";
import RepostDialog from "@/components/repostDialog/RepostDialog";
import {
  useTogglePostBookmark,
  useTogglePostLike,
  useTogglePostRepost,
} from "@/query/HomeQuery";

interface PostModalProps {
  post: PostTypes;
  onClose: () => void;
}

export default function PostModal({ post, onClose }: PostModalProps) {
  const { user } = useUserStore();
  const [content, setContent] = useState("");
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked ?? false);
  const [reposted, setReposted] = useState(post.isReposted ?? false);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [repostCount, setRepostCount] = useState(post._count?.reposts ?? 0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showRepostDialog, setShowRepostDialog] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: toggleLike, isPending: isTogglingLike } = useTogglePostLike();
  const { mutate: toggleBookmark, isPending: isTogglingBookmark } =
    useTogglePostBookmark();
  const { mutate: toggleRepost, isPending: isTogglingRepost } =
    useTogglePostRepost();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetComments(post.id);

  const { mutate: createComment, isPending } = useCreateComment(post.id);

  const comments = data?.pages.flatMap((p) => p.data.comments) ?? [];

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    setLiked(post.isLiked ?? false);
    setBookmarked(post.isBookmarked ?? false);
    setReposted(post.isReposted ?? false);
    setLikeCount(post._count?.likes ?? 0);
    setRepostCount(post._count?.reposts ?? 0);
  }, [
    post._count?.likes,
    post._count?.reposts,
    post.id,
    post.isBookmarked,
    post.isLiked,
    post.isReposted,
  ]);

  const handleSubmit = () => {
    if (!content.trim()) return;
    createComment(
      { content: content.trim() },
      { onSuccess: () => setContent("") },
    );
  };

  const handleLike = () => {
    if (isTogglingLike) return;

    const previousLiked = liked;
    const previousCount = likeCount;
    const nextLiked = !liked;

    setLiked(nextLiked);
    setLikeCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    toggleLike(post.id, {
      onSuccess: (response) => {
        setLiked(response.data.liked);
        setLikeCount(response.data.likesCount);
      },
      onError: () => {
        setLiked(previousLiked);
        setLikeCount(previousCount);
      },
    });
  };

  const handleBookmark = () => {
    if (isTogglingBookmark) return;

    const previousBookmarked = bookmarked;
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);

    toggleBookmark(post.id, {
      onSuccess: (response) => {
        setBookmarked(response.data.bookmarked);
      },
      onError: () => {
        setBookmarked(previousBookmarked);
      },
    });
  };

  const handleConfirmRepost = () => {
    if (isTogglingRepost) return;

    const previousReposted = reposted;
    const previousCount = repostCount;
    const nextReposted = !reposted;

    setReposted(nextReposted);
    setRepostCount((prev) => Math.max(0, prev + (nextReposted ? 1 : -1)));

    toggleRepost(post.id, {
      onSuccess: (response) => {
        setReposted(response.data.reposted);
        setRepostCount(response.data.repostsCount);
        setShowRepostDialog(false);
      },
      onError: () => {
        setReposted(previousReposted);
        setRepostCount(previousCount);
      },
    });
  };

  const mediaItems = post.media ?? [];

  return (
    <>
      {createPortal(
        <div
          className={styles.overlay}
          ref={overlayRef}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modal}>
        {/* ── Left: post ── */}
        <div className={styles.postSide}>
          <div className={styles.postSideInner}>
            {/* Close */}
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Author */}
            <div className={styles.postHeader}>
              <Link
                href={`/profile/${post.user.id}`}
                className={styles.avatarLink}
                onClick={onClose}
              >
                {post.user.avatar ? (
                  <img
                    src={post.user.avatar}
                    alt={post.user.username}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    {post.user.username[0].toUpperCase()}
                  </div>
                )}
              </Link>
              <div>
                <div className={styles.postName}>
                  {post.user.username}
                  {post.user.isVerified && (
                    <span className={styles.verified}>✓</span>
                  )}
                </div>
                <div className={styles.postHandle}>@{post.user.username}</div>
              </div>
            </div>

            {/* Content */}
            <p className={styles.postBody}>{post.content}</p>

            {/* Media */}
            {mediaItems.length > 0 && (
              <div
                className={styles.mediaGrid}
                data-count={Math.min(mediaItems.length, 4)}
              >
                {mediaItems.slice(0, 4).map((media, i) => (
                  <button
                    key={media.id}
                    type="button"
                    className={styles.mediaItem}
                    data-count={Math.min(mediaItems.length, 4)}
                    onClick={() => setViewerIndex(i)}
                  >
                    {media.type === "IMAGE" || media.type === "GIF" ? (
                      <img
                        src={media.url}
                        alt=""
                        className={styles.mediaImg}
                        loading="lazy"
                      />
                    ) : (
                      <video
                        src={media.url}
                        preload="metadata"
                        className={styles.mediaImg}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div className={styles.postTime}>
              {new Date(post.createdAt).toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>

            {/* Stats */}
            <div className={styles.postStats}>
              {likeCount > 0 && (
                <span className={styles.stat}>
                  <strong>{likeCount}</strong> Likes
                </span>
              )}
              {(post._count?.comments ?? 0) > 0 && (
                <span className={styles.stat}>
                  <strong>{post._count!.comments}</strong> Replies
                </span>
              )}
              {repostCount > 0 && (
                <span className={styles.stat}>
                  <strong>{repostCount}</strong> Reposts
                </span>
              )}
            </div>

            {/* Actions */}
            <div className={styles.postActions}>
              <button
                className={`${styles.actionBtn} ${liked ? styles.liked : ""}`}
                onClick={handleLike}
                aria-label={liked ? "Unlike" : "Like"}
                aria-pressed={liked}
                disabled={isTogglingLike}
              >
                <Heart size={16} />
                <span>{liked ? "Unlike" : "Like"}</span>
              </button>
              <button
                className={`${styles.actionBtn} ${reposted ? styles.reposted : ""}`}
                onClick={() => setShowRepostDialog(true)}
                type="button"
              >
                <Repeat2 size={16} />
                <span>{reposted ? "Reposted" : "Repost"}</span>
              </button>
              <button
                className={`${styles.actionBtn} ${bookmarked ? styles.bookmarked : ""}`}
                onClick={handleBookmark}
                disabled={isTogglingBookmark}
                type="button"
              >
                <Bookmark size={16} />
                <span>{bookmarked ? "Saved" : "Save"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: comments ── */}
        <div className={styles.commentSide}>
          {/* Header */}
          <div className={styles.commentHeader}>
            <span className={styles.commentTitle}>Replies</span>
            {(post._count?.comments ?? 0) > 0 && (
              <span className={styles.commentCount}>
                {post._count!.comments}
              </span>
            )}
          </div>

          {/* Comments list */}
          <div className={styles.commentList}>
            {isLoading && (
              <div className={styles.loadingStack}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={styles.skeleton} />
                ))}
              </div>
            )}

            {!isLoading && comments.length === 0 && (
              <div className={styles.empty}>
                <p>No replies yet. Be the first.</p>
              </div>
            )}

            {comments.map((comment) => (
              <Comment key={comment.id} data={comment} postId={post.id} />
            ))}

            {hasNextPage && (
              <button
                className={styles.loadMore}
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </button>
            )}
          </div>

          {/* Compose */}
          <div className={styles.compose}>
            <div className={styles.composeRow}>
              <div className={styles.composeAvatar}>
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className={styles.composeAvatarImg}
                  />
                ) : (
                  <div className={styles.composeAvatarFallback}>
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <textarea
                ref={textareaRef}
                className={styles.composeInput}
                placeholder="Post your reply..."
                value={content}
                rows={2}
                onChange={(e) => {
                  setContent(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />
            </div>
            <div className={styles.composeActions}>
              <span className={styles.charCount}>{content.length}/500</span>
              <Button
                size="sm"
                onClick={handleSubmit}
                isLoading={isPending}
                disabled={!content.trim() || content.length > 500 || isPending}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
          </div>
        </div>,
        document.body,
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
          username={post.user.username}
          onClose={() => setShowRepostDialog(false)}
          onConfirm={handleConfirmRepost}
          isPending={isTogglingRepost}
        />
      )}
    </>
  );
}
