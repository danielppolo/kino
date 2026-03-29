"use client";

import React from "react";

import { QueryClientProvider } from "@tanstack/react-query";

import { createAppQueryClient } from "@/utils/query-cache";

const queryClient = createAppQueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
