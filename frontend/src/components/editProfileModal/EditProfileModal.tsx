"use client";
import styles from "./EditProfileModal.module.scss";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import { Input } from "@/ui/Input/Input";
import { useEditProfile, EditProfileInput } from "@/query/ProfileQuery";
import { useUploadMedia } from "@/query/HomeQuery";
import { ProfileUser } from "@/types/Types";
import { toast } from "sonner";

interface EditProfileModalProps {
  profile: ProfileUser;
  onClose: () => void;
}

export default function EditProfileModal({
  profile,
  onClose,
}: EditProfileModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<EditProfileInput>({
    username: profile.username,
    handle: profile.handle ?? "",
    bio: profile.bio ?? "",
    avatar: profile.avatar ?? "",
    headerPhoto: profile.headerPhoto ?? "",
  });
  const [uploadTarget, setUploadTarget] = useState<"avatar" | "header" | null>(
    null,
  );

  const { mutate: editProfile, isPending, error } = useEditProfile();
  const { mutateAsync: uploadMedia, isPending: isUploadingMedia } =
    useUploadMedia();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = () => {
    editProfile(form, { onSuccess: onClose });
  };

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: "avatar" | "header",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadTarget(target);
      const urls = await uploadMedia([file]);
      const nextUrl = urls[0];

      if (!nextUrl) {
        throw new Error("Upload did not return a media URL");
      }

      setForm((current) => ({
        ...current,
        ...(target === "avatar"
          ? { avatar: nextUrl }
          : { headerPhoto: nextUrl }),
      }));
    } catch (uploadError: any) {
      toast.error(uploadError.message ?? "Media upload failed");
    } finally {
      setUploadTarget(null);
      event.target.value = "";
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
          <h2 className={styles.title}>Edit profile</h2>
          <Button size="sm" onClick={handleSubmit} isLoading={isPending}>
            Save
          </Button>
        </div>

        {/* Cover preview */}
        <div
          className={styles.coverPreview}
          style={
            form.headerPhoto
              ? { backgroundImage: `url(${form.headerPhoto})` }
              : undefined
          }
        >
          <button
            className={styles.coverEditBtn}
            aria-label="Edit cover"
            onClick={() => headerInputRef.current?.click()}
            type="button"
          >
            <Camera size={16} />
            <span className={styles.uploadLabel}>
              {uploadTarget === "header" && isUploadingMedia
                ? "Uploading header..."
                : "Change header"}
            </span>
          </button>
          <input
            ref={headerInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => handleUpload(event, "header")}
          />
        </div>

        {/* Avatar preview */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrap}>
            {form.avatar ? (
              <img
                src={form.avatar}
                alt={profile.username}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {profile.username[0].toUpperCase()}
              </div>
            )}
            <button
              className={styles.avatarEditBtn}
              aria-label="Edit avatar"
              onClick={() => avatarInputRef.current?.click()}
              type="button"
            >
              <Camera size={14} />
              <span className={styles.uploadLabel}>
                {uploadTarget === "avatar" && isUploadingMedia
                  ? "Uploading..."
                  : "Change"}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => handleUpload(event, "avatar")}
            />
          </div>
        </div>

        {/* Form */}
        <div className={styles.form}>
          <Input
            label="Name"
            value={form.username}
            onChange={(e) =>
              setForm((p) => ({ ...p, username: e.target.value }))
            }
            isError={false}
            maxLength={40}
          />

          <Input
            label="Username"
            value={form.handle ?? ""}
            onChange={(e) =>
              setForm((p) => ({ ...p, handle: e.target.value }))
            }
            isError={false}
            maxLength={25}
            placeholder="@username"
          />

          <div className={styles.field}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Tell people about yourself"
              maxLength={160}
              rows={3}
            />
            <span className={styles.charCount}>
              {(form.bio ?? "").length}/160
            </span>
          </div>

          {error && <p className={styles.errorMsg}>{error.message}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
