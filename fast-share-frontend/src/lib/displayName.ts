/** localStorage key for the user's display name (sigma name) */
const STORAGE_KEY = "fastShare_displayName";

/** Max length for display name */
export const DISPLAY_NAME_MAX_LENGTH = 15;

/** Random sigma-style names (all ≤ 15 chars) */
const SIGMA_NAMES = [
  "SwiftFox",
  "BoldEagle",
  "CosmicWolf",
  "NeonPulse",
  "StellarMind",
  "LunarFlare",
  "RadiantOne",
  "VividDream",
  "GoldenAura",
  "DigitalSage",
  "ThunderBolt",
  "QuantumVibe",
  "InfiniteLoop",
  "ElectricSoul",
  "CreativeForce",
  "MysticRaven",
  "NovaBlaze",
  "ShadowLynx",
  "CrimsonTide",
  "FrostByte",
  "SolarFlare",
  "IronWill",
  "StormRider",
  "ZenMaster",
  "EchoStar",
];

/** Generate a new random sigma name (for "Pick random" in UI). */
export function generateRandomDisplayName(): string {
  return SIGMA_NAMES[Math.floor(Math.random() * SIGMA_NAMES.length)];
}

/**
 * Get the current display name from storage (or null if not set).
 */
export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.slice(0, DISPLAY_NAME_MAX_LENGTH) : null;
}

/**
 * Set the display name. Trims and enforces max length. Returns the stored value.
 */
export function setDisplayName(name: string): string {
  const trimmed = name.trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, trimmed);
  }
  return trimmed;
}

/**
 * Ensure the user has a display name: use existing or generate a random one.
 * Call after ensureClientUUID(). Returns the display name.
 */
export function ensureDisplayName(): string {
  const existing = getDisplayName();
  if (existing) return existing;
  const name = generateRandomDisplayName();
  setDisplayName(name);
  return name;
}
