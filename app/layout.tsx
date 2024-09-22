import { GeistSans } from "geist/font/sans";
import { ThemeProvider } from "next-themes";

import Navbar from "../components/shared/navbar";
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
              <div className="flex-1 w-full flex flex-col">
                <Navbar />
                {children}

                {/* <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16"></footer> */}
              </div>
            </main>
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
