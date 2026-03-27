import LeftSideBar from "@/components/home/LeftSideBar/LeftSideBar";
import LocationSync from "@/components/location/LocationSync";
import styles from "./HomeWrapper.module.scss";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section className={`container ${styles.section}`}>
      <LocationSync />
      <LeftSideBar />
      <div className={styles.body}>{children}</div>
    </section>
  );
}
