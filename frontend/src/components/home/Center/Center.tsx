"use client";
import { PostSkeleton } from "@/components/common/SkeletonLoader";
import styles from "./Center.module.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCreatePost,
  useInfinitePosts,
  useUploadMedia,
} from "@/query/HomeQuery";
import { useUserStore } from "@/store/userStore";
import { ImageIcon, Plus, X } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import { useRef, useState, useCallback } from "react";
import Feed from "../Feed/Feed";
import { useInView } from "react-intersection-observer";
import { useDropzone } from "react-dropzone";
import { postSchema } from "@/lib/Schemas/zodSchema";

interface PreviewFile {
  file: File;
  preview: string;
}

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "video/mp4": [".mp4"],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 4;

export default function Center() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts();
  const { user } = useUserStore();
  const { mutateAsync: uploadMedia } = useUploadMedia();
  const { mutate: createPost, isPending } = useCreatePost();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState("");
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showMobileComposer, setShowMobileComposer] = useState(false);
  const [uploading, setUploading] = useState(false);

  const posts = data?.flattenedPosts ?? [];

  const { ref: loadMoreRef } = useInView({
    rootMargin: "300px",
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
  });

  // ── Dropzone ────────────────────────────
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      const newErrors: string[] = [];

      // Handle rejections from dropzone itself
      rejectedFiles.forEach(({ file, errors: errs }) => {
        errs.forEach((err: any) => {
          if (err.code === "file-too-large") {
            newErrors.push(`${file.name}: must be under 10MB`);
          } else if (err.code === "file-invalid-type") {
            newErrors.push(`${file.name}: unsupported format`);
          } else if (err.code === "too-many-files") {
            newErrors.push(`Maximum ${MAX_FILES} files allowed`);
          }
        });
      });

      const remaining = MAX_FILES - previews.length;
      const toAdd = acceptedFiles.slice(0, remaining);

      if (acceptedFiles.length > remaining) {
        newErrors.push(
          `Maximum 4 images — ${acceptedFiles.length - remaining} ignored`,
        );
      }

      const newPreviews: PreviewFile[] = toAdd.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setErrors(newErrors);
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
    [previews.length],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    noClick: true, // we control clicks manually via the button
    noKeyboard: true,
    disabled: previews.length >= MAX_FILES,
  });

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Submit ──────────────────────────────
  const handleSubmit = async () => {
    setUploading(true);
    setErrors([]);

    const validation = postSchema.safeParse({
      content,
      files: previews.map((p) => p.file),
    });

    if (!validation.success) {
      setErrors(validation.error.issues.map((i) => i.message));
      return;
    }

    try {
      const mediaUrls =
        previews.length > 0
          ? await uploadMedia(previews.map((p) => p.file))
          : [];

      createPost(
        { content: content.trim(), mediaUrls },
        {
          onSuccess: () => {
            setContent("");
            setShowMobileComposer(false);
            setPreviews((prev) => {
              prev.forEach((p) => URL.revokeObjectURL(p.preview));
              return [];
            });
            if (textareaRef.current) textareaRef.current.style.height = "auto";
          },
          onError: (err) => setErrors([err.message]),
        },
      );
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : "Something went wrong"]);
    } finally {
      setUploading(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const charCount = content.length;
  const charLimit = 500;
  const isOverLimit = charCount > charLimit;
  const canSubmit = content.trim().length >= 5 && !isOverLimit && !isPending;

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        {/* ── Header ── */}
        <header className={styles.streamHeader}>
          <div className={styles.streamHeaderInner}>
            <h1 className={styles.streamTitle}>Home</h1>
            <span className={styles.streamBadge}>
              <span className={styles.streamBadgeDot} aria-hidden="true" />
              Live
            </span>
          </div>
        </header>

        {/* ── Mobile backdrop ── */}
        {showMobileComposer && (
          <button
            type="button"
            className={styles.mobileComposerBackdrop}
            aria-label="Close composer"
            onClick={() => setShowMobileComposer(false)}
          />
        )}

        {/* ── Compose card ── */}
        <section
          className={`${styles.composeCard} ${showMobileComposer ? styles.composeCardOpen : ""}`}
        >
          {/* Dropzone wrapper — covers the whole card */}
          <div
            {...getRootProps()}
            className={`${styles.compose} ${isDragActive ? styles.composeDragging : ""}`}
          >
            {/* Hidden dropzone input */}
            <input {...getInputProps()} />

            {/* Drag overlay */}
            {isDragActive && (
              <div className={styles.dragOverlay} aria-hidden="true">
                <ImageIcon size={28} />
                <span>Drop images here</span>
              </div>
            )}

            {/* Avatar */}
            <div className={styles.composeAvatar}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className={styles.avatarImg}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {user?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Body */}
            <div className={styles.composeBody}>
              <textarea
                ref={textareaRef}
                className={styles.input}
                placeholder="What's happening?"
                value={content}
                onChange={handleTextareaChange}
                rows={3}
              />

              {/* Previews */}
              {previews.length > 0 && (
                <div className={styles.previews} data-count={previews.length}>
                  {previews.map((p, i) => (
                    <div key={i} className={styles.previewItem}>
                      <img
                        src={p.preview}
                        alt=""
                        className={styles.previewImg}
                      />
                      <button
                        className={styles.removeBtn}
                        onClick={() => removePreview(i)}
                        aria-label="Remove image"
                        type="button"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <ul className={styles.errorList}>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}

              {/* Actions */}
              <div className={styles.composeActions}>
                <div className={styles.composeLeft}>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Attach image"
                    onClick={open} // opens the file picker
                    disabled={previews.length >= MAX_FILES}
                    type="button"
                  >
                    <ImageIcon size={18} />
                    {previews.length > 0 && (
                      <span className={styles.fileCount}>
                        {previews.length}/{MAX_FILES}
                      </span>
                    )}
                  </Button>
                </div>

                <div className={styles.composeRight}>
                  <span
                    className={`${styles.charCount} ${isOverLimit ? styles.charOver : ""}`}
                  >
                    {charCount}/{charLimit}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmit}
                    isLoading={uploading}
                    disabled={uploading}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.streamBreak}>
          <span>Latest</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col">
            {[...Array(5)].map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className={styles.feed}>
            {posts.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>
                  <ImageIcon size={28} />
                </div>
                <h3 className={styles.emptyTitle}>The stage is yours</h3>
                <p>Nothing here yet. Be the first to post.</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {posts.map((post, i) => (
                <motion.div
                  key={post.feedEventId ?? post.id}
                  initial={{ opacity: 0, y: 20, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.4,
                    delay: i < 10 ? i * 0.05 : 0,
                    ease: "easeOut",
                  }}
                  layout
                >
                  <Feed data={post} />
                </motion.div>
              ))}
            </AnimatePresence>

            <div ref={loadMoreRef} className={styles.loadMoreTrigger} />

            {isFetchingNextPage && (
              <div className="py-4">
                <PostSkeleton />
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.mobileComposerButton}
        aria-label="Create post"
        onClick={() => setShowMobileComposer(true)}
      >
        <Plus size={20} />
      </button>
    </main>
  );
}
