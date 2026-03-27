import { ReactNode } from "react";
import styles from "./Card.module.scss";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`${styles.card} ${className}`.trim()}>{children}</div>;
}
