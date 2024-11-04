import { LogOut, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { ThemeSwitcher } from "../../../../components/theme-switcher";
import { Button } from "../../../../components/ui/button";

import { signOutAction } from "@/app/actions";
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
        <Button type="submit" variant="ghost" size="sm">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  ) : null;
}
