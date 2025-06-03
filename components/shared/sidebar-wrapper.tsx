import { ReactNode } from "react";

import { NavUser } from "./nav-user";
import { SidebarHeaderMenu } from "./sidebar-header-menu";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

interface SidebarWrapperProps {
  children: ReactNode;
  variant?: "inset" | "sidebar";
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function SidebarWrapper({
  children,
  className,
  showHeader = true,
  showFooter = true,
}: SidebarWrapperProps) {
  return (
    <Sidebar variant="inset" className={className}>
      {showHeader && (
        <SidebarHeader>
          <SidebarHeaderMenu />
        </SidebarHeader>
      )}
      <SidebarContent>{children}</SidebarContent>
      {showFooter && (
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
