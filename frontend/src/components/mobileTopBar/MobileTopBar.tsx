"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useGetNotifications } from "@/query/NotificationsQuery";
import styles from "./MobileTopBar.module.scss";

const getTitle = (pathname: string) => {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/explore")) return "Explore";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/messages")) return "Messages";
  if (pathname.startsWith("/bookmarks")) return "Bookmarks";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/profile")) return "Profile";
  return "Xprex";
};

export default function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUserStore();
  const { data: notificationsData } = useGetNotifications();

  const unreadNotifications = useMemo(
    () => notificationsData?.data?.filter((item) => !item.read).length ?? 0,
    [notificationsData?.data],
  );

  if (!user || pathname === "/auth") return null;

  return (
    <header className={styles.container}>
      <div className={styles.inner}>
        <Link href="/" className={styles.identity}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} className={styles.avatar} />
          ) : (
            <div className={styles.avatarFallback}>
              {user.username[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <span className={styles.eyebrow}>Xprex</span>
            <strong className={styles.title}>{getTitle(pathname)}</strong>
          </div>
        </Link>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => router.push("/explore")}
            aria-label="Search and explore"
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => router.push("/notifications")}
            aria-label="Open notifications"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className={styles.badge}>
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
