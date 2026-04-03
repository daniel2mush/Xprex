"use client";

import React from "react";
import styles from "./SkeletonLoader.module.scss";

interface SkeletonProps {
  type?: "avatar" | "title" | "text" | "text-short" | "media";
  className?: string;
}

export const Skeleton = ({ type = "text", className = "" }: SkeletonProps) => {
  const classNames = [
    styles.skeleton,
    type === "avatar" && styles.avatar,
    type === "title" && styles.title,
    type === "text" && styles.text,
    type === "text-short" && `${styles.text} ${styles.textShort}`,
    type === "media" && styles.media,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classNames} aria-hidden="true" />;
};

export const PostSkeleton = () => {
  return (
    <div className="p-4 border-b border-border-dark animate-pulse opacity-50">
      <div className="flex gap-3">
        <Skeleton type="avatar" />
        <div className="flex-1">
          <Skeleton type="title" />
          <Skeleton type="text" />
          <Skeleton type="text-short" />
          <Skeleton type="media" />
        </div>
      </div>
    </div>
  );
};
