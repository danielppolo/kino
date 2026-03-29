"use client";

import { PropsWithChildren } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { signOutAction } from "@/app/actions";
import { clearPersistedQueryCaches } from "@/utils/query-cache";

interface SignOutButtonProps extends PropsWithChildren {
  className?: string;
}

export function SignOutButton({
  children,
  className,
}: SignOutButtonProps) {
  const queryClient = useQueryClient();

  const handleClick = () => {
    queryClient.clear();
    clearPersistedQueryCaches();
  };

  return (
    <button
      className={className}
      formAction={signOutAction}
      onClick={handleClick}
      type="submit"
    >
      {children}
    </button>
  );
}
