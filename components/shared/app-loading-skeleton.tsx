"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

function SidebarItemSkeleton() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-14" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppLoadingSkeleton() {
  return (
    <>
      <Sidebar variant="inset">
        <SidebarHeader>
          <div className="flex h-12 items-center gap-3 px-2">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {([4, 3] as const).map((count, gi) => (
            <SidebarGroup key={gi}>
              <SidebarGroupLabel>
                <Skeleton className="h-3 w-8" />
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {Array.from({ length: count }).map((_, i) => (
                    <SidebarItemSkeleton key={i} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex h-12 items-center gap-3 px-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="flex h-11 items-center gap-3 border-b px-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="flex flex-col">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex h-10 items-center gap-3 border-b px-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
              <div className="flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </SidebarInset>
    </>
  );
}
