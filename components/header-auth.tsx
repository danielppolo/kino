import { LogOut, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { ThemeSwitcher } from "./theme-switcher";
import { Button } from "./ui/button";

import { signOutAction } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";

export default async function AuthButton() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user ? (
    <div className="flex items-center">
      <ThemeSwitcher />
      <Link href="/app/settings">
        <Button type="submit" variant="ghost" size="sm">
          <SlidersHorizontal className="size-4" />
        </Button>
      </Link>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="sm">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
