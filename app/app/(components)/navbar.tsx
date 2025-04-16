"use client";

import { Blocks, Home, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { NAVBAR_HEIGHT } from "@/utils/constants";

function NavbarLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={`${pathname === href ? "text-foreground" : "text-muted-foreground"}`}
    >
      <Button variant="ghost" size="icon">
        {children}
      </Button>
    </Link>
  );
}

export default function Navbar() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-background md:hidden"
      style={{
        height: NAVBAR_HEIGHT,
      }}
    >
      <nav className="flex h-full items-center justify-around px-4">
        <NavbarLink href="/app">
          <Home className="size-6" />
        </NavbarLink>

        <NavbarLink href="/app/wallets">
          <Wallet className="size-6" />
        </NavbarLink>

        <NavbarLink href="/app/settings">
          <Blocks className="size-6" />
        </NavbarLink>

        <NavbarLink href="/app/settings">
          <Settings className="size-6" />
        </NavbarLink>
      </nav>
    </div>
  );
}
