"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "./client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // getQueryClient() returns the browser singleton on the client, avoiding a new
  // client on every render.
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
