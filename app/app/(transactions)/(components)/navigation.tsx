import { LogOut, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { ThemeSwitcher } from "../../../../components/theme-switcher";
import { Button } from "../../../../components/ui/button";

import { signOutAction } from "@/app/actions";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { createClient } from "@/utils/supabase/server";

export default async function Navigation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? (
    <div className="flex items-center">
      <ThemeSwitcher />
      <Link href="/app/settings">
        <Button type="submit" variant="ghost" size="sm">
          <SlidersHorizontal className="size-4" />
        </Button>
      </Link>
      <form action={signOutAction}>
        <Button asChild type="button" variant="ghost" size="sm">
          <SignOutButton>
            <LogOut className="size-4" />
          </SignOutButton>
        </Button>
      </form>
    </div>
  ) : null;
}
