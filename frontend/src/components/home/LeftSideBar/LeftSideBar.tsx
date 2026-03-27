"use client";
import {
  Bell,
  Compass,
  HomeIcon,
  MessageCircle,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
} from "lucide-react";
import styles from "./LeftSideBar.module.scss";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useCollapsedStore } from "@/store/sideBarStore";

interface NavigationItem {
  icon: ReactNode;
  name: string;
  link: string;
}

const SideNav: NavigationItem[] = [
  { icon: <HomeIcon size={20} />, name: "Home", link: "/" },
  { icon: <Compass size={20} />, name: "Explore", link: "/explore" },
  { icon: <Bell size={20} />, name: "Notifications", link: "/notifications" },
  { icon: <MessageCircle size={20} />, name: "Messages", link: "/messages" },
  { icon: <User size={20} />, name: "Profile", link: "/profile" },
  { icon: <Settings size={20} />, name: "Settings", link: "/settings" },
];

export default function LeftSideBar() {
  const { user } = useUserStore();
  const pathname = usePathname();
  const { collapsed, setCollapsedValue } = useCollapsedStore();

  if (!user) return null;

  if (pathname === "/auth") return null;

  return (
    <aside
      className={`${styles.container} ${collapsed ? styles.collapsed : ""}`}
    >
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.header}>
          <div className={styles.logoMark} aria-hidden="true" />
          <span className={styles.logoText}>Social X</span>
        </div>

        {/* Navigation */}
        <nav className={styles.navs}>
          {SideNav.map(({ icon, name, link }) => (
            <Link
              key={name}
              href={link}
              className={`${styles.nav} ${pathname === link ? styles.active : ""}`}
              title={collapsed ? name : undefined}
            >
              <i className={styles.navIcon}>{icon}</i>
              <span className={styles.navLabel}>{name}</span>
              {pathname === link && (
                <span className={styles.activeIndicator} aria-hidden="true" />
              )}
            </Link>
          ))}
        </nav>

        {/* Profile */}
        <div className={styles.profile}>
          <Link href="/profile" className={styles.profileLink}>
            <div className={styles.avatar}>
              {/* {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className={styles.avatarImg}
                />
              ) : ( */}

              {/* )} */}
              <div className={styles.avatarFallback}>
                {user.username?.[0]?.toUpperCase()}
              </div>
              <span className={styles.onlineDot} aria-hidden="true" />
            </div>
            <div className={styles.info}>
              <span className={styles.infoName}>{user.username}</span>
              <span className={styles.infoEmail}>{user.email}</span>
            </div>
          </Link>

          <button className={styles.profileMore} aria-label="More options">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Collapse toggle — pinned to sidebar edge */}
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsedValue(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
    </aside>
  );
}
