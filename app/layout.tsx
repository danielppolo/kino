import type { Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";

import Providers from "./app/providers";

import "./globals.css";
import "lucide-static/font/lucide.css";
import { Toaster } from "@/components/ui/sonner";

const display = localFont({
  src: "./fonts/OpticianSans/Optician-Sans.otf",
  variable: "--font-display",
  weight: "400",
  style: "normal",
});

const untitledSans = localFont({
  src: [
    {
      path: "./fonts/untitled-sans/UntitledSansWeb-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/untitled-sans/UntitledSansWeb-LightItalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/untitled-sans/UntitledSansWeb-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/untitled-sans/UntitledSansWeb-RegularItalic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Kino",
  description: "Kino is finance app",
  other: {
    "apple-mobile-web-app-title": "cuatrocientosdos",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(0 0% 100%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(0 0% 3.9%)" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${untitledSans.variable} bg-sidebar`}
      suppressHydrationWarning
    >
      <body className="bg-sidebar">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <main className="flex min-h-screen flex-col">{children}</main>
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
