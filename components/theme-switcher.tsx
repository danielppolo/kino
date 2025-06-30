"use client";

import { ReactNode } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ThemeSwitcherProps {
  children?: ReactNode;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showToast?: boolean;
}

const ThemeSwitcher = ({
  children,
  variant = "ghost",
  size = "sm",
  className,
  showToast = true,
}: ThemeSwitcherProps) => {
  const { theme, setTheme } = useTheme();

  const getNextTheme = () => {
    return theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  };

  const cycleTheme = () => {
    const nextTheme = getNextTheme();
    setTheme(nextTheme);
    if (showToast) {
      toast.info(`${nextTheme} theme`);
    }
  };

  const getThemeIcon = () => {
    const nextTheme = getNextTheme();
    if (nextTheme === "light") {
      return <Sun key="light" className="size-4" />;
    } else if (nextTheme === "dark") {
      return <Moon key="dark" className="size-4" />;
    } else {
      return <Laptop key="system" className="size-4" />;
    }
  };

  const getThemeLabel = () => {
    const nextTheme = getNextTheme();
    return nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1);
  };

  return (
    <Button
      variant={variant}
      onClick={cycleTheme}
      size={size}
      className={className}
    >
      {getThemeIcon()}
      {getThemeLabel()}
    </Button>
  );
};

export { ThemeSwitcher };
