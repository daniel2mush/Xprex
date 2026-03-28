"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MediaItem } from "@/types/Types";
import styles from "./MediaViewer.module.scss";

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

export default function MediaViewer({
  items,
  initialIndex = 0,
  onClose,
}: MediaViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const activeItem = items[activeIndex];

  const hasControls = items.length > 1;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasControls) {
        setActiveIndex((current) => (current - 1 + items.length) % items.length);
      }
      if (event.key === "ArrowRight" && hasControls) {
        setActiveIndex((current) => (current + 1) % items.length);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [hasControls, items.length, onClose]);

  const label = useMemo(
    () => `Media ${activeIndex + 1} of ${items.length}`,
    [activeIndex, items.length],
  );

  if (!activeItem) return null;

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close media viewer"
      >
        <X size={18} />
      </button>

      {hasControls && (
        <button
          type="button"
          className={`${styles.navBtn} ${styles.leftBtn}`}
          onClick={() =>
            setActiveIndex((current) => (current - 1 + items.length) % items.length)
          }
          aria-label="Previous media"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <div className={styles.stage}>
        {activeItem.type === "VIDEO" ? (
          <video
            src={activeItem.url}
            controls
            autoPlay
            className={styles.media}
          />
        ) : (
          <img src={activeItem.url} alt={activeItem.alt ?? label} className={styles.media} />
        )}
        <span className={styles.counter}>{label}</span>
      </div>

      {hasControls && (
        <button
          type="button"
          className={`${styles.navBtn} ${styles.rightBtn}`}
          onClick={() => setActiveIndex((current) => (current + 1) % items.length)}
          aria-label="Next media"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>,
    document.body,
  );
}
