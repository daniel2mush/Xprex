"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Camera,
  Globe,
  LayoutPanelLeft,
  LogOut,
  MoonStar,
  Palette,
  SunMedium,
  UserRound,
} from "lucide-react";
import Card from "@/components/card/Card";
import { Button } from "@/ui/Buttons/Buttons";
import { Input } from "@/ui/Input/Input";
import { useUserStore } from "@/store/userStore";
import { useCollapsedStore } from "@/store/sideBarStore";
import {
  useDeleteAccount,
  useEditProfile,
  useGetProfile,
  useUpdateAccountSecurity,
} from "@/query/ProfileQuery";
import { useUploadMedia } from "@/query/HomeQuery";
import { toast } from "sonner";
import styles from "./SettingsPage.module.scss";
import { formatHandle, getProfileIdentifier, getProfilePath } from "@/lib/profile";

type SettingsForm = {
  username: string;
  handle: string;
  bio: string;
  location: string;
  avatar: string;
  headerPhoto: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, clearUser } = useUserStore();
  const { collapsed, setCollapsedValue } = useCollapsedStore();
  const { data: profileData } = useGetProfile(getProfileIdentifier(user));
  const { mutate: editProfile, isPending: isSaving } = useEditProfile();
  const { mutate: updateAccountSecurity, isPending: isUpdatingSecurity } =
    useUpdateAccountSecurity();
  const { mutate: deleteAccount, isPending: isDeletingAccount } =
    useDeleteAccount();
  const { mutateAsync: uploadMedia, isPending: isUploading } = useUploadMedia();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const profile = profileData?.data.user;
  const [form, setForm] = useState<SettingsForm>({
    username: user?.username ?? "",
    handle: user?.handle ?? "",
    bio: user?.bio ?? "",
    location: user?.location ?? "",
    avatar: user?.avatar ?? "",
    headerPhoto: user?.headerPhoto ?? "",
  });
  const [uploadTarget, setUploadTarget] = useState<"avatar" | "header" | null>(
    null,
  );
  const [securityForm, setSecurityForm] = useState({
    email: user?.email ?? "",
    currentPassword: "",
    newPassword: "",
  });
  const handlePreview = formatHandle(form.handle);

  useEffect(() => {
    if (!profile && !user) return;

    setForm({
      username: profile?.username ?? user?.username ?? "",
      handle: profile?.handle ?? user?.handle ?? "",
      bio: profile?.bio ?? user?.bio ?? "",
      location: profile?.location ?? user?.location ?? "",
      avatar: profile?.avatar ?? user?.avatar ?? "",
      headerPhoto: profile?.headerPhoto ?? user?.headerPhoto ?? "",
    });
    setSecurityForm((current) => ({
      ...current,
      email: profile?.email ?? user?.email ?? current.email,
    }));
  }, [profile, user]);

  if (!user) return null;

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
      toast.success(
        target === "avatar" ? "Profile photo uploaded" : "Header photo uploaded",
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploadTarget(null);
      event.target.value = "";
    }
  };

  const handleSave = () => {
    editProfile(
      {
        username: form.username,
        handle: form.handle,
        bio: form.bio,
        location: form.location,
        avatar: form.avatar,
        headerPhoto: form.headerPhoto,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearUser();
      router.push("/auth");
      router.refresh();
    }
  };

  const handleSecuritySave = () => {
    updateAccountSecurity(
      {
        email: securityForm.email.trim() || undefined,
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Account security updated");
          setSecurityForm((current) => ({
            ...current,
            currentPassword: "",
            newPassword: "",
          }));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Delete your account permanently? This will remove your profile, posts, and messages.",
    );

    if (!confirmed) return;
    if (!securityForm.currentPassword.trim()) {
      toast.error("Enter your current password before deleting your account");
      return;
    }

    deleteAccount(securityForm.currentPassword, {
      onSuccess: async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        }).catch(() => undefined);

        clearUser();
        toast.success("Account deleted");
        router.push("/auth");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <section className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Settings</p>
            <h1 className={styles.title}>Manage your account and preferences</h1>
            <p className={styles.subtitle}>
              Update your public profile, tune the interface, and manage your
              current session from one place.
            </p>
          </div>

          <Card className={styles.profileSnapshot}>
            <div
              className={styles.snapshotBanner}
              style={
                form.headerPhoto
                  ? { backgroundImage: `url(${form.headerPhoto})` }
                  : undefined
              }
            />
            <div className={styles.snapshotBody}>
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt={form.username}
                  className={styles.snapshotAvatar}
                />
              ) : (
                <div className={styles.snapshotAvatarFallback}>
                  {(form.username || user.username)[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <strong>{form.username || user.username}</strong>
                <p>{handlePreview}</p>
              </div>
            </div>
          </Card>
        </header>

        <section className={styles.grid}>
          <Card className={styles.profileCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.cardEyebrow}>Profile</p>
                <h2 className={styles.cardTitle}>Public identity</h2>
              </div>
              <UserRound size={16} className={styles.cardIcon} />
            </div>

            <div className={styles.mediaEditors}>
              <button
                type="button"
                className={styles.headerEditor}
                onClick={() => headerInputRef.current?.click()}
                style={
                  form.headerPhoto
                    ? { backgroundImage: `url(${form.headerPhoto})` }
                    : undefined
                }
              >
                <Camera size={14} />
                <span>
                  {uploadTarget === "header" && isUploading
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

              <div className={styles.avatarEditorRow}>
                <div className={styles.avatarEditor}>
                  {form.avatar ? (
                    <img
                      src={form.avatar}
                      alt={form.username}
                      className={styles.avatarPreview}
                    />
                  ) : (
                    <div className={styles.avatarPreviewFallback}>
                      {(form.username || user.username)[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={styles.avatarEditorCopy}>
                  <strong>Profile photo</strong>
                  <p>Use a clear photo people will recognize in the feed.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera size={14} />
                  {uploadTarget === "avatar" && isUploading
                    ? "Uploading..."
                    : "Change"}
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => handleUpload(event, "avatar")}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <Input
                label="Display name"
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                maxLength={40}
              />
              <Input
                label="Username"
                value={form.handle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    handle: event.target.value,
                  }))
                }
                placeholder="@username"
                maxLength={25}
              />
              <Input
                label="Location"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Bio</label>
              <textarea
                className={styles.textarea}
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                rows={4}
                maxLength={160}
                placeholder="Tell people what you are building, learning, or sharing."
              />
              <span className={styles.helperText}>{form.bio.length}/160</span>
            </div>

            <div className={styles.actions}>
              <Button onClick={handleSave} isLoading={isSaving}>
                Save changes
              </Button>
              <Link href={getProfilePath(user)} className={styles.inlineLink}>
                View public profile
              </Link>
            </div>
          </Card>

          <div className={styles.sideStack}>
            <Card className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardEyebrow}>Appearance</p>
                  <h2 className={styles.cardTitle}>Interface preferences</h2>
                </div>
                <Palette size={16} className={styles.cardIcon} />
              </div>

              <div className={styles.preferenceBlock}>
                <span className={styles.preferenceLabel}>Theme</span>
                <div className={styles.themeSwitches}>
                  <button
                    type="button"
                    className={`${styles.themeButton} ${theme === "dark" ? styles.themeButtonActive : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    <MoonStar size={14} />
                    Dark
                  </button>
                  <button
                    type="button"
                    className={`${styles.themeButton} ${theme === "light" ? styles.themeButtonActive : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    <SunMedium size={14} />
                    Light
                  </button>
                </div>
              </div>

              <div className={styles.preferenceBlock}>
                <span className={styles.preferenceLabel}>Sidebar density</span>
                <button
                  type="button"
                  className={styles.preferenceToggle}
                  onClick={() => setCollapsedValue(!collapsed)}
                >
                  <LayoutPanelLeft size={14} />
                  {collapsed ? "Use compact sidebar" : "Use expanded sidebar"}
                </button>
              </div>
            </Card>

            <Card className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardEyebrow}>Account</p>
                  <h2 className={styles.cardTitle}>Session and visibility</h2>
                </div>
                <Globe size={16} className={styles.cardIcon} />
              </div>

              <dl className={styles.accountList}>
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently joined"}
                  </dd>
                </div>
                <div>
                  <dt>Messaging access</dt>
                  <dd>Followers and following only</dd>
                </div>
              </dl>

              <div className={styles.sessionActions}>
                <Link href="/explore" className={styles.inlineLink}>
                  Explore people and posts
                </Link>
                <Button variant="danger-text" onClick={handleLogout}>
                  <LogOut size={14} />
                  Logout
                </Button>
              </div>
            </Card>

            <Card className={styles.settingsCard}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={styles.cardEyebrow}>Security</p>
                  <h2 className={styles.cardTitle}>Account access</h2>
                </div>
                <Globe size={16} className={styles.cardIcon} />
              </div>

              <div className={styles.formGrid}>
                <Input
                  label="Email"
                  type="email"
                  value={securityForm.email}
                  onChange={(event) =>
                    setSecurityForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Current password"
                  type="password"
                  value={securityForm.currentPassword}
                  onChange={(event) =>
                    setSecurityForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
                <Input
                  label="New password"
                  type="password"
                  value={securityForm.newPassword}
                  onChange={(event) =>
                    setSecurityForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </div>

              <div className={styles.sessionActions}>
                <Button onClick={handleSecuritySave} isLoading={isUpdatingSecurity}>
                  Save security
                </Button>
                <Button
                  variant="danger-text"
                  onClick={handleDeleteAccount}
                  isLoading={isDeletingAccount}
                >
                  Delete account
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </section>
  );
}
