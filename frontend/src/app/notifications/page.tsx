"use client";
import { NotificationTypes } from "@/types/Types";
import styles from "./Notifications.module.scss";
import { timeAgoShort } from "@/lib/ParseDate";
import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import Link from "next/link";
import {
  useGetNotifications,
  useMarkAllRead,
} from "@/query/NotificationsQuery";

const NotificationIcon = ({ type }: { type: NotificationTypes["type"] }) => {
  const icons = {
    LIKE: <Heart size={14} className={styles.iconLike} />,
    COMMENT: <MessageCircle size={14} className={styles.iconComment} />,
    REPLY: <MessageCircle size={14} className={styles.iconReply} />,
    FOLLOW: <UserPlus size={14} className={styles.iconFollow} />,
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
  }
};

export default function NotificationsPage() {
  const { data, isLoading } = useGetNotifications();
  const { mutate: markAllRead, isPending } = useMarkAllRead();

  const notifications = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

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

      {notifications.map((n) => (
        <Link
          key={n.id}
          href={n.post ? `/posts/${n.post.id}` : `/profile/${n.actor.id}`}
          className={`${styles.item} ${!n.read ? styles.unread : ""}`}
        >
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
              {timeAgoShort(new Date(n.createdAt))}
            </span>
          </div>

          {!n.read && <span className={styles.unreadDot} aria-hidden="true" />}
        </Link>
      ))}
    </div>
  );
}
