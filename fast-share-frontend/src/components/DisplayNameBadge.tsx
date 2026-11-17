"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/Avatar";
import { useDisplayName } from "@/contexts/DisplayNameContext";
import { generateRandomDisplayName } from "@/lib/displayName";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DisplayNameBadgeProps {
  className?: string;
  /** Render as a full-width row (used in the room's People panel). */
  block?: boolean;
}

export function DisplayNameBadge({ className, block = false }: DisplayNameBadgeProps) {
  const { displayName } = useDisplayName();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn("h-9 gap-2 px-2 font-medium", block && "h-auto w-full justify-start py-2", className)}
          aria-label={`Your name is ${displayName}. Change it`}
        >
          <Avatar name={displayName} className="size-6 text-[10px]" />
          <span className="max-w-[12ch] truncate">{displayName}</span>
          {block && <span className="ml-auto text-xs font-normal text-muted-foreground">Change</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        {/* Mounts on open, so it always starts from the current name */}
        <NameForm onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function NameForm({ onDone }: { onDone: () => void }) {
  const { displayName, setDisplayName, maxLength } = useDisplayName();
  const [value, setValue] = useState(displayName);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().slice(0, maxLength);
    if (!trimmed) {
      toast.error("Enter a name to save it");
      return;
    }
    setDisplayName(trimmed);
    onDone();
    toast.success("Name saved");
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <label htmlFor="display-name" className="text-sm font-medium">
          Your name in rooms
        </label>
        <p className="text-xs text-muted-foreground">Others see this next to your messages.</p>
      </div>
      <div className="flex gap-2">
        <Input
          id="display-name"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
          maxLength={maxLength}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => setValue(generateRandomDisplayName())}
          aria-label="Suggest a random name"
          title="Suggest a random name"
        >
          <Shuffle />
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs tabular-nums text-muted-foreground">
          {value.length}/{maxLength}
        </span>
        <Button type="submit" size="sm">
          Save name
        </Button>
      </div>
    </form>
  );
}
