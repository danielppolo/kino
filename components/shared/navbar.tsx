import React from "react";

import HeaderAuth from "@/components/header-auth";

const Navbar: React.FC = async () => {
  return (
    <nav className="sticky top-0 z-50 bg-background w-full flex justify-end items-center border-b border-b-foreground/10 h-11 container mx-auto">
      <div className="flex">
        <HeaderAuth />
      </div>
    </nav>
  );
};

export default Navbar;
