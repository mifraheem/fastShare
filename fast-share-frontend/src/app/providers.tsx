"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DisplayNameProvider>{children}</DisplayNameProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
