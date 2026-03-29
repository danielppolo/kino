"use client";

import { useEffect, useState } from "react";
import {
  ChevronsUpDown,
  Eye,
  EyeOff,
  LogOut,
  Receipt,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { UpdateProfileForm } from "@/components/shared/update-profile-form";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DrawerDialog } from "@/components/ui/drawer-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useFeatureFlags, useSettings } from "@/contexts/settings-context";
import { createClient } from "@/utils/supabase/client";

export function NavUser() {
  const { isMobile } = useSidebar();
  const { bills_enabled } = useFeatureFlags();

  const {
    moneyVisible,
    toggleMoneyVisibility,
    showOwedInBalance,
    toggleShowOwedInBalance,
  } = useSettings();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      if (supabaseUser) {
        setUser({
          name:
            supabaseUser.user_metadata?.display_name ||
            supabaseUser.email?.split("@")[0] ||
            "User",
          email: supabaseUser.email || "",
          avatar: supabaseUser.user_metadata?.avatar_url || "",
        });
      }
    };

    fetchUser();
  }, []);

  if (!user) return null;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {/* <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar> */}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  {/* <span className="truncate text-xs">{user.email}</span> */}
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setProfileOpen(true)}
              >
                <User className="size-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-2" asChild>
                <Link href="/app/settings/wallets">
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-2">
                <ThemeSwitcher
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full justify-start gap-2 p-0"
                  showToast={false}
                >
                  Theme
                </ThemeSwitcher>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={toggleMoneyVisibility}
              >
                {moneyVisible ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
                {moneyVisible ? "Hide" : "Show"} Money
              </DropdownMenuItem>
              {bills_enabled && (
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onClick={toggleShowOwedInBalance}
                >
                  <Receipt className="size-4" />
                  {showOwedInBalance ? "Hide" : "Include"} Owed in Balance
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <form action={signOutAction} className="w-full">
                  <SignOutButton className="flex w-full items-center gap-2 bg-transparent">
                    <LogOut className="size-4" />
                    Logout
                  </SignOutButton>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <DrawerDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        title="Edit Profile"
        description="Update your profile information"
      >
        <UpdateProfileForm
          initialDisplayName={user.name}
          onSuccess={() => setProfileOpen(false)}
        />
      </DrawerDialog>
    </>
  );
}
