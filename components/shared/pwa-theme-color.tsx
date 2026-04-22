"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const LIGHT = "hsl(0, 0%, 98%)";
const DARK = "hsl(240, 5.9%, 10%)";

export default function PwaThemeColor() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "dark" ? DARK : LIGHT;
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((el) => el.setAttribute("content", color));
  }, [resolvedTheme]);

  return null;
}
