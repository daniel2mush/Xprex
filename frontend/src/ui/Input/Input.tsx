import { ComponentProps, forwardRef } from "react";
import style from "./Input.module.scss";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  error?: string; // renamed: "errors" (plural) is odd for a single message
  isError?: boolean; // now optional — defaults to !!error if omitted
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, isError, error, className = "", ...props }, ref) => {
    const hasError = isError ?? !!error;

    return (
      <div className={style.container}>
        {label && <label className={style.label}>{label}</label>}
        <input
          ref={ref}
          className={`${style.input} ${hasError ? style.inputError : ""} ${className}`.trim()}
          aria-invalid={hasError}
          {...props}
        />
        {error && (
          <span className={style.error} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
