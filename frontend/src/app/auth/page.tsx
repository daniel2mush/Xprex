import RegisterPage from "@/components/auth/register/Register";
import LoginPage from "@/components/auth/login/Login";
import { Tabs } from "radix-ui";
import { ArrowUpRight, Sparkles, Waves } from "lucide-react";
import style from "./auth.module.scss";

export default function AuthPage() {
  return (
    <section className={style.page}>
      <div className={style.shell}>
        <aside className={style.brandPanel}>
          <div className={style.brandTopRow}>
            <div className={style.logoRow}>
              <div className={style.logo} aria-hidden="true" />
              <p className={style.brandEyebrow}>Xprex</p>
            </div>
            <span className={style.brandBadge}>
              <Sparkles size={13} />
              Live social
            </span>
          </div>

          <div className={style.heroStack}>
            <h1 className={style.heroTitle}>Social, but sharper.</h1>
            <p className={style.heroCopy}>
              A cleaner place to post, chat, and keep up with what matters.
            </p>
          </div>

          <div className={style.showcaseCard}>
            <div className={style.showcaseOrb} aria-hidden="true" />
            <div className={style.showcaseHeader}>
              <div>
                <p className={style.showcaseEyebrow}>Tonight on your feed</p>
                <strong className={style.showcaseTitle}>
                  Fast conversations, clean focus
                </strong>
              </div>
              <Waves size={16} />
            </div>

            <div className={style.showcaseRail}>
              <span className={style.showcaseChip}>Timeline</span>
              <span className={style.showcaseChip}>Messages</span>
              <span className={style.showcaseChip}>Profile</span>
            </div>

            <div className={style.showcaseMetrics}>
              <div className={style.metricCard}>
                <strong>Real-time</strong>
                <span>Posts and chats without the clutter.</span>
              </div>
              <div className={style.metricCard}>
                <strong>Theme-first</strong>
                <span>Dark and light that feel intentionally designed.</span>
              </div>
            </div>
          </div>

          <div className={style.inlineHighlights}>
            <div className={style.inlineHighlight}>
              <span>Minimal UI</span>
              <ArrowUpRight size={14} />
            </div>
            <div className={style.inlineHighlight}>
              <span>Better focus</span>
              <ArrowUpRight size={14} />
            </div>
          </div>
        </aside>

        <div className={style.formPanel}>
          <div className={style.formHeader}>
            <p className={style.formEyebrow}>Account access</p>
            <h2 className={style.heading}>Welcome back</h2>
            <p className={style.subheading}>
              Sign in or create an account to get back in instantly.
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
        </div>
      </div>
    </section>
  );
}
