"use client";
import { NotificationTypes, PostTypes } from "@/types/Types";
import styles from "./Notifications.module.scss";
import { timeAgoShort } from "@/lib/ParseDate";
import { Bell, Heart, MessageCircle, Repeat2, UserPlus } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import Link from "next/link";
import { getProfilePath } from "@/lib/profile";
import { useState } from "react";
import {
  useGetNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
} from "@/query/NotificationsQuery";
import PostModal from "@/components/postModal/PostModal";

const NotificationIcon = ({ type }: { type: NotificationTypes["type"] }) => {
  const icons = {
    LIKE: <Heart size={14} className={styles.iconLike} />,
    COMMENT: <MessageCircle size={14} className={styles.iconComment} />,
    REPLY: <MessageCircle size={14} className={styles.iconReply} />,
    FOLLOW: <UserPlus size={14} className={styles.iconFollow} />,
    REPOST: <Repeat2 size={14} className={styles.iconReply} />,
    MESSAGE: <MessageCircle size={14} className={styles.iconComment} />,
  };
  return <span className={styles.iconWrap}>{icons[type]}</span>;
};

const notificationText = (n: NotificationTypes): string => {
  switch (n.type) {
    case "LIKE":
      return `liked your post`;
    case "COMMENT":
      return `commented on your post`;
    case "REPLY":
      return `replied to your comment`;
    case "FOLLOW":
      return `started following you`;
    case "REPOST":
      return `reposted your post`;
    case "MESSAGE":
      return `sent you a message`;
  }
};

export default function NotificationsPage() {
  const { data, isLoading } = useGetNotifications();
  const { mutate: markAllRead, isPending } = useMarkAllRead();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  const [activePost, setActivePost] = useState<PostTypes | null>(null);
  const [loadingPostId, setLoadingPostId] = useState<string | null>(null);

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const openPostModal = async (notificationId: string, postId: string) => {
    try {
      markNotificationRead(notificationId);
      setLoadingPostId(postId);
      const response = await fetch(`/api/posts/${postId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load post");
      }

      const payload = await response.json();
      setActivePost(payload.data);
    } catch (error) {
      console.error("Failed to open post modal", error);
    } finally {
      setLoadingPostId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead()}
            isLoading={isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading && (
        <div className={styles.loadingStack}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className={styles.empty}>
          <Bell size={32} className={styles.emptyIcon} />
          <p>No notifications yet</p>
        </div>
      )}

      {notifications.map((n) => {
        const itemClassName = `${styles.item} ${!n.read ? styles.unread : ""}`;
        const itemContent = (
          <>
            <div className={styles.actorAvatar}>
              {n.actor.avatar ? (
                <img
                  src={n.actor.avatar}
                  alt={n.actor.username}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {n.actor.username[0].toUpperCase()}
                </div>
              )}
              <NotificationIcon type={n.type} />
            </div>

            <div className={styles.itemBody}>
              <p className={styles.itemText}>
                <span className={styles.actorName}>{n.actor.username}</span>{" "}
                {notificationText(n)}
              </p>
              {n.post && (
                <p className={styles.postPreview}>
                  {n.post.content.slice(0, 60)}
                  {n.post.content.length > 60 ? "..." : ""}
                </p>
              )}
              <span className={styles.time}>
                {loadingPostId === n.post?.id
                  ? "Opening post..."
                  : timeAgoShort(new Date(n.createdAt))}
              </span>
            </div>

            {!n.read && <span className={styles.unreadDot} aria-hidden="true" />}
          </>
        );

        if (n.post) {
          return (
            <button
              key={n.id}
              type="button"
              className={itemClassName}
              onClick={() => openPostModal(n.id, n.post!.id)}
              disabled={loadingPostId === n.post.id}
            >
              {itemContent}
            </button>
          );
        }

        return (
          <Link
            key={n.id}
            href={getProfilePath(n.actor)}
            className={itemClassName}
            onClick={() => markNotificationRead(n.id)}
          >
            {itemContent}
          </Link>
        );
      })}

      {activePost && (
        <PostModal post={activePost} onClose={() => setActivePost(null)} />
      )}
    </div>
  );
}
