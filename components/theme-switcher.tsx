"use client";

import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  // Function to cycle between light, dark, and system themes
  const cycleTheme = () => {
    const nextTheme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
    toast.info(`${nextTheme} theme`);
  };

  return (
    <Button variant="ghost" size={"sm"} onClick={cycleTheme}>
      {theme === "light" ? (
        <Sun key="light" size={ICON_SIZE} className={"text-muted-foreground"} />
      ) : theme === "dark" ? (
        <Moon key="dark" size={ICON_SIZE} className={"text-muted-foreground"} />
      ) : (
        <Laptop
          key="system"
          size={ICON_SIZE}
          className={"text-muted-foreground"}
        />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
