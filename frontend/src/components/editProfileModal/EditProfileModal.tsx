"use client";
import styles from "./EditProfileModal.module.scss";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera } from "lucide-react";
import { Button } from "@/ui/Buttons/Buttons";
import { Input } from "@/ui/Input/Input";
import { useEditProfile, EditProfileInput } from "@/query/ProfileQuery";
import { ProfileUser } from "@/types/Types";

interface EditProfileModalProps {
  profile: ProfileUser;
  onClose: () => void;
}

export default function EditProfileModal({
  profile,
  onClose,
}: EditProfileModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<EditProfileInput>({
    username: profile.username,
    bio: profile.bio ?? "",
  });

  const { mutate: editProfile, isPending, error } = useEditProfile();

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
        <div className={styles.coverPreview}>
          <button className={styles.coverEditBtn} aria-label="Edit cover">
            <Camera size={16} />
          </button>
        </div>

        {/* Avatar preview */}
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrap}>
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarFallback}>
                {profile.username[0].toUpperCase()}
              </div>
            )}
            <button className={styles.avatarEditBtn} aria-label="Edit avatar">
              <Camera size={14} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className={styles.form}>
          <Input
            label="Username"
            value={form.username}
            onChange={(e) =>
              setForm((p) => ({ ...p, username: e.target.value }))
            }
            isError={false}
            maxLength={30}
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
