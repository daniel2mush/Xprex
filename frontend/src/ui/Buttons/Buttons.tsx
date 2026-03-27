import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import styles from "./Buttons.module.scss";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger" | "danger-text" | "ghost" | "cta";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  size = "sm",
  className = "",
  ...props
}: ButtonProps) {
  const buttonClasses = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    isLoading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={buttonClasses}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <Loader2 className={styles.spinnerIcon} size={16} aria-hidden="true" />
      )}
      <span className={isLoading ? styles.hiddenLabel : undefined}>
        {children}
      </span>
    </button>
  );
}
