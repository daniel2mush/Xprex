import LeftSideBar from "@/components/home/LeftSideBar/LeftSideBar";
import LocationSync from "@/components/location/LocationSync";
import MobileTopBar from "@/components/mobileTopBar/MobileTopBar";
import styles from "./HomeWrapper.module.scss";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <section className={`container ${styles.section}`}>
      <LocationSync />
      <MobileTopBar />
      <LeftSideBar />
      <div className={styles.body}>{children}</div>
    </section>
  );
}
