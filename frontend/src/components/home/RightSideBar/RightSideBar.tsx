import styles from "./RightSideBar.module.scss";
import Link from "next/link";
import { Search } from "lucide-react";

const suggestions = [
  {
    username: "Sofia K.",
    handle: "sofiakay",
    gradient: ["#7c3aed", "#ec4899"],
  },
  {
    username: "Remi Torres",
    handle: "remit",
    gradient: ["#0ea5e9", "#6366f1"],
  },
  {
    username: "Yuki Mori",
    handle: "yukimori",
    gradient: ["#f59e0b", "#ef4444"],
  },
  {
    username: "Ade Bright",
    handle: "adebright",
    gradient: ["#10b981", "#0ea5e9"],
  },
];

const trending = [
  { tag: "#OpenAI", count: "42.1K" },
  { tag: "#WebDev", count: "18.4K" },
  { tag: "#TypeScript", count: "11.2K" },
  { tag: "#DesignSystems", count: "6.8K" },
];

const footerLinks = [
  "Terms",
  "Privacy",
  "Cookies",
  "Accessibility",
  "Ads info",
];

export default function RightSideBar() {
  return (
    <aside className={styles.container}>
      <div className={styles.content}>
        {/* Search */}
        <div className={styles.search}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search"
            className={styles.searchInput}
          />
        </div>

        {/* Who to follow */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Who to follow</h2>

          <ul className={styles.userList}>
            {suggestions.map(({ username, handle, gradient }) => (
              <li key={handle} className={styles.userRow}>
                <Link href={`/${handle}`} className={styles.userLink}>
                  <div
                    className={styles.avatar}
                    style={{
                      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                    }}
                  >
                    {username[0]}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{username}</span>
                    <span className={styles.userHandle}>@{handle}</span>
                  </div>
                </Link>
                <button className={styles.followBtn}>Follow</button>
              </li>
            ))}
          </ul>

          <button className={styles.showMore}>Show more</button>
        </section>

        {/* Trending */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Trending</h2>

          <ul className={styles.trendList}>
            {trending.map(({ tag, count }, i) => (
              <li key={tag} className={styles.trendRow}>
                <div>
                  <span className={styles.trendTag}>{tag}</span>
                  <span className={styles.trendCount}>{count} posts</span>
                </div>
                <span className={styles.trendRank}>{i + 1}</span>
              </li>
            ))}
          </ul>

          <button className={styles.showMore}>Show more</button>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          {footerLinks.map((link) => (
            <a key={link} href="#" className={styles.footerLink}>
              {link}
            </a>
          ))}
          <span className={styles.footerLink}>© 2026 Social X</span>
        </footer>
      </div>
    </aside>
  );
}
