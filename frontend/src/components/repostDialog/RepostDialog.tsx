"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Repeat2, X } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import styles from "./RepostDialog.module.scss";

interface RepostDialogProps {
  reposted: boolean;
  username: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export default function RepostDialog({
  reposted,
  username,
  onClose,
  onConfirm,
  isPending = false,
}: RepostDialogProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close repost dialog"
        >
          <X size={16} />
        </button>

        <div className={styles.iconWrap}>
          <Repeat2 size={18} />
        </div>

        <h2 className={styles.title}>
          {reposted ? "Undo repost?" : "Repost this update?"}
        </h2>
        <p className={styles.body}>
          {reposted
            ? `This will remove @${username}'s post from your reposted items.`
            : `Share @${username}'s post with the people who follow you.`}
        </p>

        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isPending}>
            {reposted ? "Undo repost" : "Repost"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
