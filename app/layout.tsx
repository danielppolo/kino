import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";

import "./globals.css";
import "lucide-static/font/lucide.css";
import { Toaster } from "@/components/ui/sonner";

const workSans = localFont({
  src: [
    {
      path: "./fonts/WorkSans-Thin.woff",
      weight: "100",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-ExtraLight.woff",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-Light.woff",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-Medium.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-SemiBold.woff",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-Bold.woff",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-ExtraBold.woff",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/WorkSans-Black.woff",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-work-sans",
});

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Kino",
  description: "Kino is finance app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.className} ${workSans.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="flex min-h-screen flex-col">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
