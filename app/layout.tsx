import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";

import Providers from "./providers";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
    <html lang="en" className={GeistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <main className="min-h-screen flex flex-col items-center">
              {/* <Navbar /> */}
              {children}
            </main>
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
