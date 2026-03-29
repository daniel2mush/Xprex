"use client";
import styles from "./ProfilePage.module.scss";
import ConnectionsModal from "./ConnectionsModal";
import Image from "next/image";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import {
  useGetProfile,
  useFollowUser,
  useReportUser,
  useToggleBlockUser,
  useToggleMuteUser,
} from "@/query/ProfileQuery";
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
import { useEffect, useState } from "react";
import { Button } from "@/ui/Buttons/Buttons";
import { timeAgoShort } from "@/lib/ParseDate";
import Link from "next/link";
import { toast } from "sonner";
import SafetyToolsModal from "@/components/moderation/SafetyToolsModal";
import {
  formatHandle,
  getProfileIdentifier,
  getProfilePath,
  normalizeHandle,
} from "@/lib/profile";

type ActiveTab = "posts" | "replies" | "media" | "likes";

export default function ProfilePage() {
  const params = useParams<{ userId?: string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const routeUserId = params?.userId?.[0];
  const { user: currentUser } = useUserStore();
  const isProfileRoot = pathname === "/profile";
  const currentUserHandle = normalizeHandle(currentUser?.handle);
  const routeHandle = normalizeHandle(routeUserId);
  const isLegacyOwnProfileRoute = Boolean(
    currentUser?.id && currentUserHandle && routeUserId === currentUser.id,
  );
  const resolvedUserId = isProfileRoot
    ? getProfileIdentifier(currentUser)
    : isLegacyOwnProfileRoute
      ? getProfileIdentifier(currentUser)
      : routeUserId;
  const isOwnProfile = Boolean(
    currentUser &&
      (isProfileRoot ||
        routeUserId === currentUser.id ||
        (routeHandle && routeHandle === currentUserHandle)),
  );
  const isProfilePending = !resolvedUserId;

  const [activeTab, setActiveTab] = useState<ActiveTab>("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSafetyTools, setShowSafetyTools] = useState(false);
  const [connectionsModal, setConnectionsModal] = useState<
    "followers" | "following" | null
  >(null);

  const { data, isLoading, error } = useGetProfile(resolvedUserId);
  const { mutate: followUser, isPending: isFollowing } = useFollowUser(
    data?.data.user.id ?? "",
  );
  const { mutate: toggleBlockUser, isPending: isBlocking } = useToggleBlockUser(
    data?.data.user.id ?? "",
  );
  const { mutate: toggleMuteUser, isPending: isMuting } = useToggleMuteUser(
    data?.data.user.id ?? "",
  );
  const { mutate: reportUser, isPending: isReporting } = useReportUser(
    data?.data.user.id ?? "",
  );

  const profile = data?.data.user;
  const displayProfile = isOwnProfile
    ? (profile ?? currentUser ?? undefined)
    : profile;
  const posts = data?.data.posts ?? [];
  const likedPosts = data?.data.likedPosts ?? [];
  const replies = data?.data.replies ?? [];
  const mediaPosts = posts.filter((post) => post.media.length > 0);
  const joinedDate = displayProfile?.createdAt
    ? new Date(displayProfile.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;
  const canMessage = Boolean(profile && (profile.isFollowing || profile.followsYou));
  const handleText = formatHandle(displayProfile?.handle);

  useEffect(() => {
    if (!isLegacyOwnProfileRoute || !currentUser) return;

    router.replace(getProfilePath(currentUser));
  }, [currentUser, isLegacyOwnProfileRoute, router]);

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const tabCounts: Record<ActiveTab, number> = {
    posts: posts.length,
    replies: replies.length,
    media: mediaPosts.length,
    likes: likedPosts.length,
  };

  const activePosts =
    activeTab === "posts"
      ? posts
      : activeTab === "media"
        ? mediaPosts
        : activeTab === "likes"
          ? likedPosts
          : [];

  const emptyCopy: Record<ActiveTab, string> = {
    posts: "No posts yet.",
    replies: "No replies yet.",
    media: "No media posts yet.",
    likes: "No liked posts yet.",
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        {/* Cover */}
        <div
          className={styles.cover}
          style={
            displayProfile?.headerPhoto
              ? { backgroundImage: `url(${displayProfile.headerPhoto})` }
              : undefined
          }
        >
          {isOwnProfile && (
            <button
              className={styles.coverEditBtn}
              aria-label="Edit cover"
              type="button"
              onClick={() => setShowEditModal(true)}
            >
              <Camera size={16} />
            </button>
          )}
        </div>

        {/* Identity */}
        <div className={styles.identity}>
          <div className={styles.topRow}>
            {/* Avatar */}
            <div className={styles.avatarWrap}>
              {displayProfile?.avatar ? (
                <Image
                  src={displayProfile.avatar}
                  alt={displayProfile.username}
                  className={styles.avatar}
                  width={84}
                  height={84}
                  unoptimized
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {displayProfile?.username?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              {isOwnProfile && (
                <button
                  className={styles.avatarEditBtn}
                  aria-label="Edit avatar"
                  type="button"
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canMessage || profile?.isBlocked}
                    onClick={() => {
                      if (!profile || !canMessage) return;
                      router.push(`/messages?userId=${profile.id}`);
                    }}
                  >
                    Message
                  </Button>
                  <Button
                    size="sm"
                    disabled={!profile || profile.isBlocked}
                    onClick={() => {
                      if (!profile) return;
                      followUser();
                    }}
                    isLoading={isFollowing}
                  >
                    {profile?.isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {!isOwnProfile && profile && (
            <div className={styles.moderationRow}>
              <Button variant="outline" size="sm" onClick={() => setShowSafetyTools(true)}>
                Safety tools
              </Button>
            </div>
          )}

          {/* Name + handle */}
          <div className={styles.nameRow}>
            <h1 className={styles.name}>
              {displayProfile?.username ?? "Profile"}
            </h1>
            {displayProfile?.isVerified && (
              <span className={styles.verified} aria-label="Verified">
                <CheckCircle2 size={14} />
              </span>
            )}
          </div>
          <p className={styles.handle}>
            {handleText}
          </p>

          {/* Bio */}
          {displayProfile?.bio && <p className={styles.bio}>{displayProfile.bio}</p>}

          {/* Meta */}
          <div className={styles.metaRow}>
            {joinedDate && (
              <span className={styles.metaItem}>
                <CalendarDays size={13} />
                Joined {joinedDate}
              </span>
            )}
            {displayProfile?.location && (
              <span className={styles.metaItem}>
                <MapPin size={13} />
                {displayProfile.location}
              </span>
            )}
            {isOwnProfile && !profile?.location && (
              <span className={styles.metaItem}>
                <MapPin size={13} />
                Detecting your location...
              </span>
            )}
            <a
              href="https://xprex.app"
              target="_blank"
              rel="noreferrer"
              className={styles.metaLink}
            >
              <Link2 size={13} />
              xprex.app
            </a>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <strong>{formatCount(displayProfile?._count?.posts ?? 0)}</strong>
              <span>Posts</span>
            </div>
            <button
              type="button"
              className={styles.stat}
              onClick={() => setConnectionsModal("followers")}
            >
              <strong>{formatCount(displayProfile?._count?.followers ?? 0)}</strong>
              <span>Followers</span>
            </button>
            <button
              type="button"
              className={styles.stat}
              onClick={() => setConnectionsModal("following")}
            >
              <strong>{formatCount(displayProfile?._count?.following ?? 0)}</strong>
              <span>Following</span>
            </button>
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
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                <span className={styles.tabCount}>
                  {formatCount(tabCounts[tab])}
                </span>
              </button>
            ),
          )}
        </div>

        {/* Feed */}
        {(isLoading || isProfilePending) && (
          <div className={styles.skeletonStack}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {!isLoading && !isProfilePending && error && (
          <div className={styles.empty}>
            <p>{error.message}</p>
          </div>
        )}

        {!isLoading &&
          !isProfilePending &&
          !error &&
          activeTab !== "replies" &&
          activePosts.length === 0 && (
            <div className={styles.empty}>
              <p>{emptyCopy[activeTab]}</p>
            </div>
          )}

        {!isLoading &&
          !isProfilePending &&
          !error &&
          activeTab === "replies" &&
          replies.length === 0 && (
            <div className={styles.empty}>
              <p>{emptyCopy.replies}</p>
            </div>
          )}

        {!isLoading &&
          !isProfilePending &&
          !error &&
          activeTab === "replies" &&
          replies.map((reply) => (
            <article key={reply.id} className={styles.replyCard}>
              <div className={styles.replyHeader}>
                <Link
                  href={getProfilePath(reply.user)}
                  className={styles.replyAuthorLink}
                >
                  {reply.user.avatar ? (
                    <Image
                      src={reply.user.avatar}
                      alt={reply.user.username}
                      className={styles.replyAvatar}
                      width={42}
                      height={42}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.replyAvatarFallback}>
                      {reply.user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className={styles.replyAuthorRow}>
                      <span className={styles.replyAuthor}>
                        {reply.user.username}
                      </span>
                      {reply.user.isVerified && (
                        <CheckCircle2
                          size={13}
                          className={styles.replyVerified}
                        />
                      )}
                    </div>
                    <span className={styles.replyMeta}>
                      replied {timeAgoShort(new Date(reply.createdAt))}
                    </span>
                  </div>
                </Link>
              </div>

              <p className={styles.replyContent}>{reply.content}</p>

              <div className={styles.replyContext}>
                <span className={styles.replyContextLabel}>In reply to</span>
                <Link
                  href={getProfilePath(reply.post.user)}
                  className={styles.replyPostAuthor}
                >
                  {formatHandle(reply.post.user.handle) || reply.post.user.username}
                </Link>
                <p className={styles.replyPostPreview}>
                  {reply.post.content || "View original post"}
                </p>
              </div>
            </article>
          ))}

        {!isLoading &&
          !isProfilePending &&
          !error &&
          activeTab !== "replies" &&
          activePosts.map((post) => (
            <Feed
              key={post.feedEventId ?? post.id}
              data={post}
              showAuthorActions={isOwnProfile}
            />
          ))}
      </main>

      <RightSideBar />

      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {connectionsModal && resolvedUserId && (
        <ConnectionsModal
          userId={resolvedUserId}
          type={connectionsModal}
          onClose={() => setConnectionsModal(null)}
        />
      )}

      {showSafetyTools && profile && (
        <SafetyToolsModal
          username={profile.handle ?? ""}
          isBlocked={Boolean(profile.isBlocked)}
          isMuted={Boolean(profile.isMuted)}
          isBlocking={isBlocking}
          isMuting={isMuting}
          isReporting={isReporting}
          onClose={() => setShowSafetyTools(false)}
          onToggleMute={() =>
            toggleMuteUser(undefined, {
              onSuccess: (result) =>
                toast.success(result.message ?? "Mute updated"),
              onError: (error) => toast.error(error.message),
            })
          }
          onToggleBlock={() =>
            toggleBlockUser(undefined, {
              onSuccess: (result) =>
                toast.success(result.message ?? "Block updated"),
              onError: (error) => toast.error(error.message),
            })
          }
          onSubmitReport={(payload) =>
            reportUser(payload, {
              onSuccess: () => {
                toast.success("Report submitted. Thanks for flagging it.");
                setShowSafetyTools(false);
              },
              onError: (error) => toast.error(error.message),
            })
          }
        />
      )}
    </div>
  );
}
