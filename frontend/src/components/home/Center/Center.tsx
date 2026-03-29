"use client";
import Card from "@/components/card/Card";
import styles from "./Center.module.scss";
import {
  useCreatePost,
  useInfinitePosts,
  useUploadMedia,
} from "@/query/HomeQuery";
import { useUserStore } from "@/store/userStore";
import { ImageIcon, Plus, X } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import { useRef, useState, useCallback, useEffect } from "react";
import Feed from "../Feed/Feed";
import { z } from "zod";
import { formatHandle } from "@/lib/profile";

const mediaSchema = z
  .instanceof(File)
  .refine((f) => f.size <= 10 * 1024 * 1024, "Image must be less than 10MB")
  .refine(
    (f) =>
      [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/mp4",
      ].includes(f.type),
    "Invalid format — JPG, PNG, WEBP or AVIF, MP4 only",
  );

const postSchema = z.object({
  content: z
    .string()
    .min(5, "Must be at least 5 characters")
    .max(500, "Cannot exceed 500 characters")
    .trim(),
  files: z.array(mediaSchema).max(4, "Maximum 4 images"),
});

interface PreviewFile {
  file: File;
  preview: string; // object URL
}

export default function Center() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePosts();
  const { user } = useUserStore();
  const handleText = formatHandle(user?.handle);
  const { mutateAsync: uploadMedia } = useUploadMedia();
  const { mutate: createPost, isPending } = useCreatePost();
  const [isSubmmiting, setIsSubmitting] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [content, setContent] = useState("");
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showMobileComposer, setShowMobileComposer] = useState(false);

  const posts = Array.from(
    new Map(
      (data?.pages.flatMap((page) => page.data.posts) ?? []).map((post) => [
        post.feedEventId ?? `post:${post.id}`,
        post,
      ]),
    ).values(),
  );
  const postCount = posts?.length ?? 0;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // ── File selection ──────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (!selected.length) return;

      const newErrors: string[] = [];
      const validFiles: PreviewFile[] = [];

      const remaining = 4 - previews.length;
      const toProcess = selected.slice(0, remaining);

      toProcess.forEach((file) => {
        const result = mediaSchema.safeParse(file);
        if (!result.success) {
          newErrors.push(`${file.name}: ${result.error.issues[0].message}`);
        } else {
          validFiles.push({ file, preview: URL.createObjectURL(file) });
        }
      });

      if (selected.length > remaining) {
        newErrors.push(
          `Maximum 4 images — ${selected.length - remaining} ignored`,
        );
      }

      setErrors(newErrors);
      setPreviews((prev) => [...prev, ...validFiles]);

      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [previews.length],
  );

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].preview); // clean up memory
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Submit ──────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    const validation = postSchema.safeParse({
      content,
      files: previews.map((p) => p.file),
    });

    if (!validation.success) {
      setErrors(validation.error.issues.map((i) => i.message));
      setIsSubmitting(false);
      return;
    }

    try {
      let mediaUrls: string[] = [];

      if (previews.length > 0) {
        mediaUrls = await uploadMedia(previews.map((p) => p.file));
      }

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
          onError: (err) => {
            setErrors([err.message]);
          },
        },
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setIsSubmitting(false);
      setErrors([message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Auto-resize textarea ────────────────
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
        <header className={styles.feedHero}>
          <div>
            <p className={styles.feedEyebrow}>Home</p>
            <h1 className={styles.feedTitle}>Your timeline</h1>
            <p className={styles.feedSubtitle}>
              Share updates, catch up with people you follow, and keep the
              conversation moving.
            </p>
          </div>
          {/* <div className={styles.feedHighlights}>
            <div className={styles.feedStat}>
              <strong>{postCount}</strong>
              <span>posts in view</span>
            </div>
            <div className={styles.feedStat}>
              <strong>{user?.location || "Global"}</strong>
              <span>posting from</span>
            </div>
          </div> */}
        </header>

        {showMobileComposer && (
          <button
            type="button"
            className={styles.mobileComposerBackdrop}
            aria-label="Close post composer"
            onClick={() => setShowMobileComposer(false)}
          />
        )}

        <Card
          className={`${styles.composeCard} ${showMobileComposer ? styles.composeCardOpen : ""}`}
        >
          <div className={styles.composeHeader}>
            <div>
              <p className={styles.composeEyebrow}>Create update</p>
            </div>
            <div className={styles.composeHeaderActions}>
              <span className={styles.composeHint}>
                Add up to 4 images or a short clip.
              </span>
              <button
                type="button"
                className={styles.mobileComposerClose}
                aria-label="Close post composer"
                onClick={() => setShowMobileComposer(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className={styles.compose}>
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

            <div className={styles.composeBody}>
              {handleText && (
                <p className={styles.composePrompt}>
                  Posting as <span>{handleText}</span>
                </p>
              )}
              <textarea
                ref={textareaRef}
                className={styles.input}
                placeholder="What are you building, noticing, or thinking about?"
                value={content}
                onChange={handleTextareaChange}
                rows={3}
              />

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
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errors.length > 0 && (
                <ul className={styles.errorList}>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}

              <div className={styles.composeActions}>
                <div className={styles.composeLeft}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,video/mp4"
                    multiple
                    onChange={handleFileChange}
                    className={styles.hiddenInput}
                    aria-hidden="true"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Attach image"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={previews.length >= 4}
                  >
                    <ImageIcon size={18} />
                    {previews.length > 0 && (
                      <span className={styles.fileCount}>
                        {previews.length}/4
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
                    isLoading={isPending}
                    disabled={!canSubmit || isSubmmiting}
                  >
                    Post update
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className={styles.divider} />

        {isLoading && (
          <div className={styles.loadingStack}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className={styles.empty}>
            <p>Nothing here yet. Be the first to post.</p>
          </div>
        )}

        {!isLoading &&
          posts.map((post) => (
            <Feed key={post.feedEventId ?? post.id} data={post} />
          ))}

        <div ref={loadMoreRef} className={styles.loadMoreTrigger} />

        {isFetchingNextPage && (
          <div className={styles.loadingStack}>
            {[...Array(2)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
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
