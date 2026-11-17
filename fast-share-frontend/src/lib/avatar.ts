// Stable per-person avatar: a hue derived from the display name, rendered as a
// quiet tint (see Avatar), plus up to two initials.

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = input.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

/** Hue 0–359 for a name; same name, same color everywhere. */
export function avatarHue(name: string): number {
  return hash((name || "?").trim().toLowerCase()) % 360;
}

/** Up to two uppercase initials for a name (falls back to "?"). */
export function avatarInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
