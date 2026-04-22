import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";

import "./globals.css";
import "lucide-static/font/lucide.css";

import { Toaster } from "@/components/ui/sonner";
import PwaRuntime from "@/components/shared/pwa-runtime";
import PwaThemeColor from "@/components/shared/pwa-theme-color";

import { Providers } from "./providers";

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

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  applicationName: "Kino",
  title: {
    default: "Kino",
    template: "%s | Kino",
  },
  description: "Kino is a finance workspace for transactions, wallets, and bills.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kino",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(0 0% 100%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(0 0% 3.9%)" },
  ],
  viewportFit: "cover",
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
            <PwaRuntime />
            <PwaThemeColor />
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
