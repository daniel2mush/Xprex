"use client";
import styles from "./Comment.module.scss";
import { timeAgoShort } from "@/lib/ParseDate";
import { CommentTypes } from "@/types/Types";
import { useUserStore } from "@/store/userStore";
import {
  useCreateComment,
  useDeleteComment,
  useGetReplies,
} from "@/query/CommentQuery";
import { useState } from "react";
import { Button } from "@/ui/Buttons/Buttons";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { formatHandle, getProfilePath } from "@/lib/profile";
import Link from "next/link";

interface CommentProps {
  data: CommentTypes;
  postId: string;
}

export default function Comment({ data, postId }: CommentProps) {
  const { user } = useUserStore();
  const [showReply, setShowReply] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const { mutate: createComment, isPending } = useCreateComment(postId);
  const { mutate: deleteComment } = useDeleteComment(postId);
  const { data: repliesData, isLoading: repliesLoading } = useGetReplies(
    data.id,
    showReplies,
  );

  const isOwner = user?.id === data.user.id;
  const replyCount = data._count.replies;
  const replies = repliesData?.data?.replies ?? data.replies; // use preview until expanded

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createComment(
      { content: replyContent.trim(), parentId: data.id },
      {
        onSuccess: () => {
          setReplyContent("");
          setShowReply(false);
        },
      },
    );
  };

  return (
    <div className={styles.container}>
      {/* Comment header */}
      <div className={styles.header}>
        <Link href={getProfilePath(data.user)} className={styles.avatarLink}>
          {data.user.avatar ? (
            <img
              src={data.user.avatar}
              alt={data.user.username}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>
              {data.user.username[0].toUpperCase()}
            </div>
          )}
        </Link>

        <div className={styles.body}>
          <div className={styles.meta}>
            <Link href={getProfilePath(data.user)} className={styles.username}>
              {data.user.username}
              {data.user.isVerified && (
                <span className={styles.verified} aria-label="Verified">
                  ✓
                </span>
              )}
            </Link>
            <span className={styles.time}>
              {timeAgoShort(new Date(data.createdAt))}
            </span>
          </div>

          <p className={styles.content}>{data.content}</p>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={styles.replyBtn}
              onClick={() => setShowReply((v) => !v)}
            >
              Reply
            </button>

            {replyCount > 0 && (
              <button
                className={styles.repliesToggle}
                onClick={() => setShowReplies((v) => !v)}
              >
                {showReplies ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            )}

            {isOwner && (
              <button
                className={styles.deleteBtn}
                onClick={() => deleteComment(data.id)}
                aria-label="Delete comment"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReply && (
            <div className={styles.replyCompose}>
              <textarea
                className={styles.replyInput}
                placeholder={`Reply to ${formatHandle(data.user.handle) || data.user.username}`}
                value={replyContent}
                rows={2}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <div className={styles.replyActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReply(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReply}
                  isLoading={isPending}
                  disabled={!replyContent.trim() || isPending}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {showReplies && (
            <div className={styles.replies}>
              {repliesLoading ? (
                <p className={styles.loadingText}>Loading replies...</p>
              ) : (
                replies.map((reply: any) => (
                  <div key={reply.id} className={styles.reply}>
                    <Link
                      href={getProfilePath(reply.user)}
                      className={styles.avatarLink}
                    >
                      {reply.user.avatar ? (
                        <img
                          src={reply.user.avatar}
                          alt={reply.user.username}
                          className={styles.replyAvatar}
                        />
                      ) : (
                        <div className={styles.replyAvatarFallback}>
                          {reply.user.username[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className={styles.replyBody}>
                      <div className={styles.meta}>
                        <span className={styles.username}>
                          {reply.user.username}
                        </span>
                        <span className={styles.time}>
                          {timeAgoShort(new Date(reply.createdAt))}
                        </span>
                      </div>
                      <p className={styles.content}>{reply.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
