import RegisterPage from "@/components/auth/register/Register";
import LoginPage from "@/components/auth/login/Login";
import { Tabs } from "radix-ui";
import style from "./auth.module.scss";

export default function AuthPage() {
  return (
    <section className={style.container}>
      <div className={style.content}>
        <div className={style.logo} />

        <h2 className={style.heading}>Welcome back</h2>
        <p className={style.subheading}>Sign in to your account to continue</p>

        <button className={style.googleBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className={style.divider}>
          <div className={style.dividerLine} />
          <span className={style.dividerText}>or</span>
          <div className={style.dividerLine} />
        </div>

        <Tabs.Root defaultValue="login" className={style.TabsRoot}>
          <Tabs.List className={style.TabsList}>
            <Tabs.Trigger className={style.TabsTrigger} value="login">
              Login
            </Tabs.Trigger>
            <Tabs.Trigger className={style.TabsTrigger} value="register">
              Register
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="login">
            <LoginPage />
          </Tabs.Content>
          <Tabs.Content value="register">
            <RegisterPage />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </section>
  );
}
