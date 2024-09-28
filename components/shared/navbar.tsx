import React from "react";

import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";

const Navbar: React.FC = async () => {
  return (
    <nav className="sticky top-0 z-50 bg-background w-full flex justify-end items-center border-b border-b-foreground/10 h-16 container mx-auto">
      <div className="flex">
        <HeaderAuth />
        <ThemeSwitcher />
      </div>
    </nav>
  );
};

export default Navbar;
