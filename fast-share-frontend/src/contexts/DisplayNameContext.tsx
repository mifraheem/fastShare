import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ensureClientUUID } from "@/lib/clientUUID";
import {
  ensureDisplayName,
  setDisplayName as setDisplayNameStorage,
  DISPLAY_NAME_MAX_LENGTH,
} from "@/lib/displayName";
import { putMe } from "@/api/me.api";
import { toast } from "sonner";

interface DisplayNameContextValue {
  displayName: string;
  setDisplayName: (name: string) => void;
  maxLength: number;
}

const DisplayNameContext = createContext<DisplayNameContextValue | null>(null);

export function DisplayNameProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayNameState] = useState<string>(() => {
    if (typeof window === "undefined") return "Guest";
    ensureClientUUID();
    return ensureDisplayName();
  });

  // Sync display name to backend on load (so server has it for messages/members)
  useEffect(() => {
    ensureClientUUID();
    const name = ensureDisplayName();
    setDisplayNameState(name);
    putMe(name).catch(() => {
      // Offline or server error; local name still works
    });
  }, []);

  const setDisplayName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
      if (!trimmed) return;
      setDisplayNameStorage(trimmed);
      setDisplayNameState(trimmed);
      putMe(trimmed)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["rooms"] });
        })
        .catch(() => {
          toast.error("Name saved locally but couldn't sync to server");
        });
    },
    [queryClient]
  );

  const value: DisplayNameContextValue = {
    displayName,
    setDisplayName,
    maxLength: DISPLAY_NAME_MAX_LENGTH,
  };

  return (
    <DisplayNameContext.Provider value={value}>
      {children}
    </DisplayNameContext.Provider>
  );
}

export function useDisplayName(): DisplayNameContextValue {
  const ctx = useContext(DisplayNameContext);
  if (!ctx) {
    throw new Error("useDisplayName must be used within DisplayNameProvider");
  }
  return ctx;
}
