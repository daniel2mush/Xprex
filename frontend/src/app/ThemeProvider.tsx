// app/ThemeProvider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme" // <--- This is the magic that connects to your CSS!
      defaultTheme="dark"
      enableSystem={false} // Set to true if you want it to match user's OS
    >
      {children}
    </NextThemesProvider>
  );
}
