import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const Navbar: React.FC = async () => {
  return (
    <nav className="sticky top-0 z-50 bg-background w-full flex justify-end items-center border-b border-b-foreground/10 h-11 container mx-auto">
      <div className="flex">
        <div className="flex gap-2">
          <Button asChild size="sm" variant={"outline"}>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant={"default"}>
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
