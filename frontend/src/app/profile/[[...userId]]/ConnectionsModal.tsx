"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, CheckCircle2, MessageCircle } from "lucide-react";
import { useGetProfileConnections } from "@/query/ProfileQuery";
import { Button } from "@/ui/Buttons/Buttons";
import styles from "./ConnectionsModal.module.scss";

interface ConnectionsModalProps {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}

export default function ConnectionsModal({
  userId,
  type,
  onClose,
}: ConnectionsModalProps) {
  const router = useRouter();
  const { data, isLoading, error } = useGetProfileConnections(userId, type, true);

  const title = type === "followers" ? "Followers" : "Following";
  const users = data?.data.users ?? [];

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Social graph</p>
            <h2 className={styles.title}>{title}</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {isLoading && (
            <div className={styles.stateBlock}>
              <p>Loading people...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className={styles.stateBlock}>
              <p>{error.message}</p>
            </div>
          )}

          {!isLoading && !error && users.length === 0 && (
            <div className={styles.stateBlock}>
              <p>No one here yet.</p>
            </div>
          )}

          {!isLoading &&
            !error &&
            users.map((connection) => (
              <article key={connection.id} className={styles.card}>
                <Link
                  href={`/profile/${connection.id}`}
                  className={styles.identity}
                  onClick={onClose}
                >
                  {connection.avatar ? (
                    <img
                      src={connection.avatar}
                      alt={connection.username}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {connection.username[0].toUpperCase()}
                    </div>
                  )}

                  <div className={styles.meta}>
                    <div className={styles.nameRow}>
                      <span className={styles.name}>{connection.username}</span>
                      {connection.isVerified && (
                        <CheckCircle2 size={14} className={styles.verified} />
                      )}
                    </div>
                    <span className={styles.handle}>@{connection.username}</span>
                    {connection.location && (
                      <span className={styles.location}>{connection.location}</span>
                    )}
                  </div>
                </Link>

                <div className={styles.actions}>
                  {connection.canMessage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        router.push(`/messages?userId=${connection.id}`);
                        onClose();
                      }}
                    >
                      <MessageCircle size={14} />
                      Message
                    </Button>
                  )}
                  <Button size="sm" onClick={() => {
                    router.push(`/profile/${connection.id}`);
                    onClose();
                  }}>
                    View Profile
                  </Button>
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}
