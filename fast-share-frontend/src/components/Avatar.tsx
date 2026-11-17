import { avatarHue, avatarInitials } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** Initials on a low-chroma tint of the person's hue (readable in both themes). */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      title={name}
      style={{ "--h": avatarHue(name) } as React.CSSProperties}
      className={cn(
        "inline-flex size-8 shrink-0 select-none items-center justify-center rounded-full text-[11px] font-semibold",
        "bg-[hsl(var(--h)_35%_90%)] text-[hsl(var(--h)_40%_28%)]",
        "dark:bg-[hsl(var(--h)_22%_22%)] dark:text-[hsl(var(--h)_45%_80%)]",
        className
      )}
    >
      {avatarInitials(name)}
    </span>
  );
}
