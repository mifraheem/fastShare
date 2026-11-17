"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ensureClientUUID } from "@/lib/clientUUID";
import { DisplayNameProvider } from "@/contexts/DisplayNameContext";

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (not shared across server requests)
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    ensureClientUUID();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <Toaster />
        <DisplayNameProvider>{children}</DisplayNameProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
