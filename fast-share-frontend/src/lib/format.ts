/** "2.4 MB", "86 KB", "312 B" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Split "a-very-long-report-name.final.pdf" into base + extension so the UI can
 * truncate the base and always keep ".pdf" visible.
 */
export function splitFilename(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1 || name.length - dot > 8) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

/** Countdown as "49:12" or "1:05:09". */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Coarse remaining time for lists: "49 min left", "2 h left", "Closed". */
export function timeLeftLabel(expiresAt: number, now = Math.floor(Date.now() / 1000)): string {
  const left = expiresAt - now;
  if (left <= 0) return "Closed";
  if (left < 60) return "Under a minute";
  if (left < 3600) return `${Math.floor(left / 60)} min left`;
  return `${Math.floor(left / 3600)} h ${Math.floor((left % 3600) / 60)} min left`;
}

export function roomPath(room: { name: string; code: string }): string {
  return `/room/${encodeURIComponent(room.name.trim().replace(/\s+/g, "-"))}/${room.code}`;
}

const ADJECTIVES = ["Quiet", "Bright", "Calm", "Clear", "Steady", "Swift", "North", "Open", "Early", "Late"];
const NOUNS = ["Harbor", "Studio", "Desk", "Signal", "Table", "Bridge", "Window", "Field", "Circle", "Room"];
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

export function generateRoomName(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
