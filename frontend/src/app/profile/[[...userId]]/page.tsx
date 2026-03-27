"use client";
import styles from "./ProfilePage.module.scss";
import { useParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useGetProfile, useFollowUser } from "@/query/ProfileQuery";
import Feed from "@/components/home/Feed/Feed";
import RightSideBar from "@/components/home/RightSideBar/RightSideBar";
import EditProfileModal from "@/components/editProfileModal/EditProfileModal";
import {
  CalendarDays,
  MapPin,
  Link2,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/Buttons/Buttons";

type ActiveTab = "posts" | "replies" | "media" | "likes";

export default function ProfilePage() {
  const params = useParams<{ userId?: string[] }>();
  const routeUserId = params?.userId?.[0];
  const { user: currentUser } = useUserStore();
  const resolvedUserId = routeUserId ?? currentUser?.id;
  const isOwnProfile = !routeUserId || routeUserId === currentUser?.id;

  const [activeTab, setActiveTab] = useState<ActiveTab>("posts");
  const [showEditModal, setShowEditModal] = useState(false);

  const { data, isLoading, error } = useGetProfile(resolvedUserId);
  const { mutate: followUser, isPending: isFollowing } = useFollowUser(
    resolvedUserId ?? "",
  );

  const profile = data?.data.user;
  const posts = data?.data.posts ?? [];
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        {/* Cover */}
        <div className={styles.cover}>
          {isOwnProfile && (
            <button className={styles.coverEditBtn} aria-label="Edit cover">
              <Camera size={16} />
            </button>
          )}
        </div>

        {/* Identity */}
        <div className={styles.identity}>
          <div className={styles.topRow}>
            {/* Avatar */}
            <div className={styles.avatarWrap}>
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {profile?.username?.[0]?.toUpperCase() ??
                    currentUser?.username?.[0]?.toUpperCase() ??
                    "U"}
                </div>
              )}
              {isOwnProfile && (
                <button
                  className={styles.avatarEditBtn}
                  aria-label="Edit avatar"
                  onClick={() => setShowEditModal(true)}
                >
                  <Camera size={13} />
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className={styles.btnRow}>
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm">
                    Message
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => followUser()}
                    isLoading={isFollowing}
                  >
                    {profile?.isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Name + handle */}
          <div className={styles.nameRow}>
            <h1 className={styles.name}>
              {profile?.username ?? currentUser?.username ?? "Profile"}
            </h1>
            {profile?.isVerified && (
              <span className={styles.verified} aria-label="Verified">
                <CheckCircle2 size={14} />
              </span>
            )}
          </div>
          <p className={styles.handle}>
            @{profile?.username ?? currentUser?.username ?? "user"}
          </p>

          {/* Bio */}
          {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}

          {/* Meta */}
          <div className={styles.metaRow}>
            {joinedDate && (
              <span className={styles.metaItem}>
                <CalendarDays size={13} />
                Joined {joinedDate}
              </span>
            )}
            <span className={styles.metaItem}>
              <MapPin size={13} />
              Amsterdam
            </span>
            <span className={styles.metaItem}>
              <Link2 size={13} />
              socialx.app
            </span>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <strong>{formatCount(profile?._count?.posts ?? 0)}</strong>
              <span>Posts</span>
            </div>
            <div className={styles.stat}>
              <strong>{formatCount(profile?._count?.followers ?? 0)}</strong>
              <span>Followers</span>
            </div>
            <div className={styles.stat}>
              <strong>{formatCount(profile?._count?.following ?? 0)}</strong>
              <span>Following</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(["posts", "replies", "media", "likes"] as ActiveTab[]).map(
            (tab) => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ),
          )}
        </div>

        {/* Feed */}
        {isLoading && (
          <div className={styles.skeletonStack}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className={styles.empty}>
            <p>{error.message}</p>
          </div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className={styles.empty}>
            <p>No posts yet.</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          posts.map((post) => <Feed key={post.id} data={post} />)}
      </main>

      <RightSideBar />

      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
