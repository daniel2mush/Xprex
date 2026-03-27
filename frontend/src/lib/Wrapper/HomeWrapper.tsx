import LeftSideBar from "@/components/home/LeftSideBar/LeftSideBar";
import styles from "./HomeWrapper.module.scss";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section className={`container ${styles.section}`}>
      <LeftSideBar />
      <div className={styles.body}>{children}</div>
    </section>
  );
}
