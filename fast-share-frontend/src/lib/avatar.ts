// Deterministic avatar styling derived from a display name, so every member
// keeps a consistent colour + initials across the whole room.

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-indigo-600",
  "from-lime-500 to-emerald-600",
  "from-red-500 to-rose-600",
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = input.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

/** A stable tailwind gradient (`from-… to-…`) for a given name. */
export function avatarGradient(name: string): string {
  const key = (name || "?").trim().toLowerCase();
  return AVATAR_GRADIENTS[hash(key) % AVATAR_GRADIENTS.length];
}

/** Up to two uppercase initials for a name (falls back to "?"). */
export function avatarInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
