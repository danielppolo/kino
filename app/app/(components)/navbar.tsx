"use client";

import { Home, Plus, Settings, Wallet } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 border-t bg-background md:hidden">
      <nav className="flex h-full items-center justify-around px-4">
        <Link href="/app">
          <Button variant="ghost" size="icon">
            <Home className="size-6" />
          </Button>
        </Link>

        <Link href="/app/wallets">
          <Button variant="ghost" size="icon">
            <Wallet className="size-6" />
          </Button>
        </Link>

        <Button variant="default" size="icon" className="rounded-full">
          <Plus className="size-6" />
        </Button>

        <Link href="/app/settings">
          <Button variant="ghost" size="icon">
            <Settings className="size-6" />
          </Button>
        </Link>
      </nav>
    </div>
  );
}
