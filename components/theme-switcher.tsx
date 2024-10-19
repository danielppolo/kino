"use client";

import { useEffect, useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const cycleTheme = () => {
    const nextTheme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
    toast.info(`${nextTheme} theme`);
  };

  return (
    <Button variant="ghost" onClick={cycleTheme} size="sm">
      {theme === "light" ? (
        <Sun key="light" className="size-4" />
      ) : theme === "dark" ? (
        <Moon key="dark" className="size-4" />
      ) : (
        <Laptop key="system" className="size-4" />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
