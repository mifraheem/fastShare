"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  id?: string;
}

/**
 * Six character slots backed by a single real <input>, so typing, paste,
 * autofill and screen readers all behave like a normal text field.
 */
export function CodeInput({ value, onChange, invalid, id }: CodeInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LENGTH))
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={LENGTH}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        className="absolute inset-0 z-10 w-full cursor-text opacity-0"
      />
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2" aria-hidden>
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = focused && (i === value.length || (i === LENGTH - 1 && value.length === LENGTH));
          return (
            <div
              key={i}
              className={cn(
                "flex h-14 items-center justify-center rounded-lg border bg-background font-mono text-2xl font-medium transition-colors",
                active && "border-primary ring-2 ring-primary/20",
                invalid && !active && "border-destructive/60"
              )}
            >
              {value[i] ?? (active ? <span className="h-6 w-px animate-pulse bg-foreground" /> : "")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
