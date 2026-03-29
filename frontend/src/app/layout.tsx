import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.scss";
import { Toaster } from "sonner";
import { Providers } from "@/query/QueryClientProvider";
import { ThemeProvider } from "./ThemeProvider";
import Wrapper from "@/lib/Wrapper/HomeWrapper";

const appName = "Xprex";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const appDescription =
  "Xprex is a modern social platform for sharing posts, discovering people, messaging friends, and following what matters in real time.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  applicationName: appName,
  keywords: [
    "Xprex",
    "social media",
    "social network",
    "messaging app",
    "community",
    "posts",
    "reposts",
    "real-time chat",
    "discover creators",
  ],
  authors: [{ name: appName }],
  creator: appName,
  publisher: appName,
  category: "social networking",
  alternates: {
    canonical: "/",
  },
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: appName,
    title: appName,
    description: appDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: appDescription,
  },
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <ThemeProvider>
          <Providers>
            <Wrapper>{children}</Wrapper>
          </Providers>
        </ThemeProvider>
        <Toaster richColors={true} />
      </body>
    </html>
  );
}
