"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, Shield, VolumeX, X } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import { ReportReason } from "@/types/Types";
import styles from "./SafetyToolsModal.module.scss";

const reportReasons: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "ABUSE", label: "Abuse" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "OTHER", label: "Other" },
];

interface SafetyToolsModalProps {
  username: string;
  isBlocked: boolean;
  isMuted: boolean;
  isBlocking?: boolean;
  isMuting?: boolean;
  isReporting?: boolean;
  onClose: () => void;
  onToggleBlock: () => void;
  onToggleMute: () => void;
  onSubmitReport: (payload: { reason: ReportReason; details?: string }) => void;
}

export default function SafetyToolsModal({
  username,
  isBlocked,
  isMuted,
  isBlocking = false,
  isMuting = false,
  isReporting = false,
  onClose,
  onToggleBlock,
  onToggleMute,
  onSubmitReport,
}: SafetyToolsModalProps) {
  const [reason, setReason] = useState<ReportReason>("OTHER");
  const [details, setDetails] = useState("");

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
          aria-label="Close safety tools"
        >
          <X size={16} />
        </button>

        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <Shield size={18} />
          </div>
          <div>
            <p className={styles.eyebrow}>Safety tools</p>
            <h2 className={styles.title}>
              {username ? `Manage @${username}` : "Manage account"}
            </h2>
          </div>
        </div>

        <p className={styles.body}>
          Quiet, block, or report this account with clearer controls than the
          quick inline actions.
        </p>

        <div className={styles.actionGrid}>
          <section className={styles.actionCard}>
            <div className={styles.actionCopy}>
              <div className={styles.actionHeading}>
                <VolumeX size={16} />
                <span>{isMuted ? "Unmute account" : "Mute account"}</span>
              </div>
              <p>
                {isMuted
                  ? "Bring this account back into your feed and discovery surfaces."
                  : "Hide this account from your feed without unfollowing them."}
              </p>
            </div>
            <Button variant="outline" onClick={onToggleMute} isLoading={isMuting}>
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          </section>

          <section className={styles.actionCard}>
            <div className={styles.actionCopy}>
              <div className={styles.actionHeading}>
                <Shield size={16} />
                <span>{isBlocked ? "Unblock account" : "Block account"}</span>
              </div>
              <p>
                {isBlocked
                  ? "Restore profile visibility and message access."
                  : "Remove them from your feed, profile access, and messages."}
              </p>
            </div>
            <Button
              variant={isBlocked ? "outline" : "danger-text"}
              onClick={onToggleBlock}
              isLoading={isBlocking}
            >
              {isBlocked ? "Unblock" : "Block"}
            </Button>
          </section>
        </div>

        <section className={styles.reportPanel}>
          <div className={styles.reportHeading}>
            <Flag size={16} />
            <span>Report this account</span>
          </div>

          <label className={styles.field}>
            <span>Reason</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
            >
              {reportReasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Details</span>
            <textarea
              rows={4}
              value={details}
              placeholder="Add context for the moderation team"
              onChange={(event) => setDetails(event.target.value)}
            />
          </label>

          <div className={styles.actions}>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() =>
                onSubmitReport({
                  reason,
                  details: details.trim() || undefined,
                })
              }
              isLoading={isReporting}
            >
              Submit report
            </Button>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
