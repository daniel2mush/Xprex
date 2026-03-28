import RegisterPage from "@/components/auth/register/Register";
import LoginPage from "@/components/auth/login/Login";
import { Tabs } from "radix-ui";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import style from "./auth.module.scss";

export default function AuthPage() {
  const highlights = [
    {
      icon: <Sparkles size={16} />,
      title: "Cleaner conversations",
      copy: "Catch up on live posts, media, and replies in one focused feed.",
    },
    {
      icon: <ShieldCheck size={16} />,
      title: "Private by default",
      copy: "Account controls and theme preferences stay available from anywhere.",
    },
    {
      icon: <CheckCircle2 size={16} />,
      title: "Ready to publish",
      copy: "Sign in, share updates, and keep your profile current without friction.",
    },
  ];

  return (
    <section className={style.page}>
      <div className={style.shell}>
        <aside className={style.brandPanel}>
          <div className={style.logoRow}>
            <div className={style.logo} aria-hidden="true" />
            <div>
              <p className={style.brandEyebrow}>Xprex</p>
              <h1 className={style.heroTitle}>A sharper home for the social layer of your app.</h1>
            </div>
          </div>

          <p className={style.heroCopy}>
            Jump back into your timeline, publish updates with confidence, and
            keep your profile and preferences synced across the experience.
          </p>

          <div className={style.metricGrid}>
            <div className={style.metricCard}>
              <strong>Live feed</strong>
              <span>Posts, replies, and media built for quick scanning.</span>
            </div>
            <div className={style.metricCard}>
              <strong>Theme-aware UI</strong>
              <span>Light and dark modes that now share the same design language.</span>
            </div>
          </div>

          <div className={style.featureList}>
            {highlights.map((item) => (
              <div key={item.title} className={style.featureItem}>
                <span className={style.featureIcon}>{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className={style.formPanel}>
          <div className={style.formHeader}>
            <p className={style.formEyebrow}>Account access</p>
            <h2 className={style.heading}>Welcome back</h2>
            <p className={style.subheading}>
              Sign in or create an account to keep your conversations and
              profile moving.
            </p>
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
            <Tabs.Content value="login" className={style.tabContent}>
              <LoginPage />
            </Tabs.Content>
            <Tabs.Content value="register" className={style.tabContent}>
              <RegisterPage />
            </Tabs.Content>
          </Tabs.Root>

          <p className={style.footerNote}>
            Themes, account preferences, and profile updates stay available
            after sign-in from the settings page.
          </p>
        </div>
      </div>
    </section>
  );
}
