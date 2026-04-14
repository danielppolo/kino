"use client";

import { useEffect, useMemo, useState } from "react";

import { Download, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { hasPersistedQueryData } from "@/utils/query-cache";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISSED_KEY = "kino-pwa-install-dismissed";

function isMacChromium() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent;
  return /Macintosh/.test(userAgent) && /(Chrome|Edg)\//.test(userAgent);
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(display-mode: standalone)").matches;
}

function Banner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pwa-banner bg-card text-card-foreground rounded-2xl border px-4 py-3 shadow-lg backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function PwaRuntime() {
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [hasCachedData, setHasCachedData] = useState(false);

  useEffect(() => {
    setIsOnline(window.navigator.onLine);
    setIsStandalone(isStandaloneDisplayMode());
    setInstallDismissed(
      window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "true",
    );
    setHasCachedData(hasPersistedQueryData());

    const updateOnlineState = () => {
      setIsOnline(window.navigator.onLine);
      setHasCachedData(hasPersistedQueryData());
    };

    const updateDisplayMode = () => {
      const standalone = isStandaloneDisplayMode();
      setIsStandalone(standalone);
      document.documentElement.dataset.displayMode = standalone
        ? "standalone"
        : "browser";
    };

    updateDisplayMode();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleInstalled = () => {
      setCanInstall(false);
      setInstallEvent(null);
      setIsStandalone(true);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    mediaQuery.addEventListener("change", updateDisplayMode);

    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in window.navigator &&
      window.isSecureContext
    ) {
      window.navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
      mediaQuery.removeEventListener("change", updateDisplayMode);
    };
  }, []);

  const showInstallBanner = useMemo(
    () => isMacChromium() && !isStandalone && !installDismissed,
    [installDismissed, isStandalone],
  );

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setCanInstall(false);
        setInstallEvent(null);
      }
      return;
    }

    window.alert(
      "In Chrome or Edge on macOS, use the address bar install button or open the browser menu and choose Install Kino.",
    );
  };

  const dismissInstall = () => {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setInstallDismissed(true);
  };

  return (
    <div className="pwa-banner-stack" aria-live="polite">
      {!isOnline ? (
        <Banner className="border-amber-300/70 bg-amber-50/95 text-amber-950 dark:border-amber-900 dark:bg-amber-950/90 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">You&apos;re offline.</p>
              <p className="mt-1 text-sm opacity-90">
                {hasCachedData
                  ? "Previously viewed data is still available in read-only mode."
                  : "This screen has not been cached yet. Reconnect to load it."}
              </p>
            </div>
          </div>
        </Banner>
      ) : null}

      {showInstallBanner ? (
        <Banner>
          <div className="flex items-start gap-3">
            <Download className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Install Kino on your Mac.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Open Kino in its own window with offline-ready shell caching and
                faster relaunches.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={handleInstall}>
                {canInstall ? "Install" : "How to install"}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissInstall}>
                Dismiss
              </Button>
            </div>
          </div>
        </Banner>
      ) : null}
    </div>
  );
}
