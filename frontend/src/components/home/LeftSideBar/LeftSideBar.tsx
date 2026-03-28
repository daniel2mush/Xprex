"use client";

import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Compass,
  HomeIcon,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
} from "lucide-react";
import styles from "./LeftSideBar.module.scss";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useCollapsedStore } from "@/store/sideBarStore";
import { useGetNotifications } from "@/query/NotificationsQuery";
import { useGetConversations } from "@/query/MessagingQuery";

interface NavigationItem {
  icon: ReactNode;
  name: string;
  link: string;
  match?: (pathname: string) => boolean;
}

const sideNav: NavigationItem[] = [
  { icon: <HomeIcon size={20} />, name: "Home", link: "/", match: (pathname) => pathname === "/" },
  {
    icon: <Compass size={20} />,
    name: "Explore",
    link: "/explore",
    match: (pathname) => pathname === "/explore" || pathname.startsWith("/explore/"),
  },
  {
    icon: <Bell size={20} />,
    name: "Notifications",
    link: "/notifications",
    match: (pathname) => pathname === "/notifications" || pathname.startsWith("/notifications/"),
  },
  {
    icon: <Bookmark size={20} />,
    name: "Bookmarks",
    link: "/bookmarks",
    match: (pathname) => pathname === "/bookmarks" || pathname.startsWith("/bookmarks/"),
  },
  {
    icon: <MessageCircle size={20} />,
    name: "Messages",
    link: "/messages",
    match: (pathname) => pathname === "/messages" || pathname.startsWith("/messages/"),
  },
  {
    icon: <User size={20} />,
    name: "Profile",
    link: "/profile",
    match: (pathname) => pathname === "/profile" || pathname.startsWith("/profile/"),
  },
  {
    icon: <Settings size={20} />,
    name: "Settings",
    link: "/settings",
    match: (pathname) => pathname === "/settings" || pathname.startsWith("/settings/"),
  },
];

export default function LeftSideBar() {
  const { user, clearUser } = useUserStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { collapsed, setCollapsedValue } = useCollapsedStore();
  const { data: notificationsData } = useGetNotifications();
  const { data: conversationsData } = useGetConversations();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const profileLink = user ? `/profile/${user.id}` : "/profile";
  const unreadNotifications =
    notificationsData?.data?.filter((notification) => !notification.read).length ?? 0;
  const unreadMessages =
    conversationsData?.data?.reduce(
      (total, conversation) => total + (conversation.unreadCount ?? 0),
      0,
    ) ?? 0;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const navigationItems = useMemo(
    () =>
      sideNav.map(({ icon, name, link, match }) => {
        const href = name === "Profile" ? profileLink : link;
        const isActive = match ? match(pathname) : pathname === href;
        const badgeCount =
          name === "Notifications"
            ? unreadNotifications
            : name === "Messages"
              ? unreadMessages
              : 0;

        return { icon, name, href, isActive, badgeCount };
      }),
    [pathname, profileLink, unreadMessages, unreadNotifications],
  );

  if (!user || pathname === "/auth") return null;

  const isActiveMobileMessageThread =
    pathname.startsWith("/messages") &&
    (searchParams.has("conversationId") || searchParams.has("userId"));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearUser();
      setMenuOpen(false);
      router.push("/auth");
      router.refresh();
    }
  };

  return (
    <aside
      className={`${styles.container} ${collapsed ? styles.collapsed : ""} ${
        isActiveMobileMessageThread ? styles.hideOnMessagesMobile : ""
      }`}
    >
      <div className={styles.content}>
        <div className={styles.headerBlock}>
          <div className={styles.brandRow}>
            <div className={styles.logoMark} aria-hidden="true" />
            <div className={styles.brandCopy}>
              <span className={styles.logoText}>Xprex</span>
              <span className={styles.logoSubtext}>Your social command center</span>
            </div>
          </div>

          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsedValue(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div className={styles.summaryCard}>
          <div>
            <p className={styles.summaryEyebrow}>Live pulse</p>
            <h2 className={styles.summaryTitle}>Stay on top of the app</h2>
          </div>
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <span className={styles.summaryValue}>{unreadMessages}</span>
              <span className={styles.summaryLabel}>Unread messages</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={styles.summaryValue}>{unreadNotifications}</span>
              <span className={styles.summaryLabel}>Alerts</span>
            </div>
          </div>
          <Link href="/explore" className={styles.summaryLink}>
            Explore what&apos;s happening
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <nav className={styles.navs}>
          {navigationItems.map(({ icon, name, href, isActive, badgeCount }) => (
            <Link
              key={`${name}-${href}`}
              href={href}
              className={`${styles.nav} ${isActive ? styles.active : ""}`}
              title={collapsed ? name : undefined}
            >
              <span className={styles.navIcon}>
                {icon}
                {badgeCount > 0 && (
                  <span className={styles.notificationBadge} aria-hidden="true">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </span>
              <span className={styles.navContent}>
                <span className={styles.navLabel}>{name}</span>
                <span className={styles.navMeta}>
                  {name === "Messages"
                    ? "Direct and follower chats"
                    : name === "Notifications"
                      ? "Mentions, follows, reactions"
                      : name === "Bookmarks"
                        ? "Saved posts for later"
                      : name === "Explore"
                        ? "Search and discover"
                        : name === "Profile"
                          ? "Your public identity"
                          : name === "Settings"
                            ? "Account and preferences"
                            : "Main timeline"}
                </span>
              </span>
              {isActive && <span className={styles.activeIndicator} aria-hidden="true" />}
            </Link>
          ))}
        </nav>

        <div className={styles.profileShell} ref={menuRef}>
          <div className={styles.profile}>
            <Link href={profileLink} className={styles.profileLink}>
              <div className={styles.avatar}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className={styles.onlineDot} aria-hidden="true" />
              </div>
              <div className={styles.info}>
                <span className={styles.infoName}>{user.username}</span>
                <span className={styles.infoEmail}>{user.email}</span>
              </div>
            </Link>

            <button
              className={styles.profileMore}
              aria-label="More options"
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
            >
              <MoreHorizontal size={15} />
            </button>
          </div>

          {menuOpen && (
            <div className={styles.profileMenu}>
              <button
                type="button"
                className={styles.profileMenuItem}
                onClick={() => {
                  setMenuOpen(false);
                  router.push(profileLink);
                }}
              >
                <User size={14} />
                Profile
              </button>
              <button
                type="button"
                className={styles.profileMenuItem}
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/settings");
                }}
              >
                <Settings size={14} />
                Settings
              </button>
              <button
                type="button"
                className={`${styles.profileMenuItem} ${styles.logoutItem}`}
                onClick={handleLogout}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
