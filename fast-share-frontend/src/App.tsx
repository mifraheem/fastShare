import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import Index from "./pages/Index";
import RoomView from "./pages/RoomView";
import NotFound from "./pages/NotFound";

import { ensureClientUUID } from "@/lib/clientUUID";
import { DisplayNameProvider } from "@/contexts/DisplayNameContext";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    ensureClientUUID();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DisplayNameProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/room/:roomName/:roomCode" element={<RoomView />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </DisplayNameProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
