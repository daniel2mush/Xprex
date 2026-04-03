"use client";
import LeftSideBar from "@/components/home/LeftSideBar/LeftSideBar";
import LocationSync from "@/components/location/LocationSync";
import MobileTopBar from "@/components/mobileTopBar/MobileTopBar";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import styles from "./HomeWrapper.module.scss";

export default function Wrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <section className={`container ${styles.section}`}>
      <LocationSync />
      <MobileTopBar />
      <LeftSideBar />
      <main className={styles.body}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              duration: 0.3,
            }}
            className={styles.pageContent}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </section>
  );
}
