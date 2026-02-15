import { useState, useEffect } from "react";
import { Pencil, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDisplayName } from "@/contexts/DisplayNameContext";
import { generateRandomDisplayName } from "@/lib/displayName";
import { toast } from "sonner";

interface DisplayNameBadgeProps {
  variant?: "default" | "compact";
  className?: string;
}

export function DisplayNameBadge({ variant = "default", className = "" }: DisplayNameBadgeProps) {
  const { displayName, setDisplayName, maxLength } = useDisplayName();
  const [open, setOpen] = useState(false);
  const [editValue, setEditValue] = useState(displayName);

  useEffect(() => {
    setEditValue(displayName);
  }, [displayName, open]);

  const handleSave = () => {
    const trimmed = editValue.trim().slice(0, maxLength);
    if (!trimmed) {
      toast.error("Name can't be empty");
      return;
    }
    setDisplayName(trimmed);
    setOpen(false);
    toast.success("Name updated!");
  };

  const handleRandom = () => {
    const newName = generateRandomDisplayName();
    setDisplayName(newName);
    setEditValue(newName);
    toast.success("New name picked!");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={variant === "compact" ? "sm" : "default"}
          className={`gap-2 font-medium shrink-0 ${className}`}
        >
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {variant === "compact" ? displayName : `Hey, ${displayName}`}
          </span>
          <Pencil className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your display name</label>
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.slice(0, maxLength))}
              maxLength={maxLength}
              placeholder="Enter name..."
              className="pr-12"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {editValue.length}/{maxLength} characters
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRandom}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Pick random
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
