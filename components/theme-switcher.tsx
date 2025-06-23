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

  const cycleTheme = () => {
    const nextTheme =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(nextTheme);
    if (showToast) {
      toast.info(`${nextTheme} theme`);
    }
  };

  const getThemeIcon = () => {
    if (theme === "light") {
      return <Sun key="light" className="size-4" />;
    } else if (theme === "dark") {
      return <Moon key="dark" className="size-4" />;
    } else {
      return <Laptop key="system" className="size-4" />;
    }
  };

  return (
    <Button
      variant={variant}
      onClick={cycleTheme}
      size={size}
      className={className}
    >
      {children ? (
        <>
          {getThemeIcon()}
          {children}
        </>
      ) : (
        getThemeIcon()
      )}
    </Button>
  );
};

export { ThemeSwitcher };
