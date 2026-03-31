"use client";

import { useState } from "react";
import RegisterPage from "@/components/auth/register/Register";
import LoginPage from "@/components/auth/login/Login";
import style from "./auth.module.scss";

export default function AuthPage() {
  const [view, setView] = useState<"login" | "register">("login");

  const toggleView = () => {
    setView((prev) => (prev === "login" ? "register" : "login"));
  };

  return (
    <main className={style.page}>
      <div className={style.container}>
        <div className={style.logoRow}>
          <div className={style.logo} aria-hidden="true" />
          <span className={style.logoText}>Xprex</span>
        </div>

        <div className={style.card}>
          <div className={style.header}>
            <h1 className={style.title}>
              {view === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className={style.subtitle}>
              {view === "login"
                ? "Enter your credentials to access your account."
                : "Join the platform to start sharing and connecting."}
            </p>
          </div>

          <div className={style.formWrapper}>
            {view === "login" ? <LoginPage /> : <RegisterPage />}
          </div>

          <div className={style.footer}>
            {view === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={toggleView} className={style.link}>
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button type="button" onClick={toggleView} className={style.link}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
