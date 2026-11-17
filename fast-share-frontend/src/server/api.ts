import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "./db";

export const ROOM_TTL_SECONDS = 3000; // 50 minutes
export const CLIENT_TTL_SECONDS = 86400;
export const MIN_EXTEND_MINUTES = 1;
export const MAX_EXTEND_MINUTES = 60;
export const MAX_NAME_LENGTH = 15;
export const MAX_ROOM_NAME_LENGTH = 60;
export const MAX_MESSAGE_LENGTH = 100_000;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // Supabase free plan upload cap

export const now = () => Math.floor(Date.now() / 1000);

/** Display name for an uploaded file: no path parts or control characters. */
export function safeFilename(name: unknown): string {
  const base = (String(name ?? "").split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(-200);
  return base && base !== "." && base !== ".." ? base : "file";
}

export const ok = (status: number, data: unknown) =>
  NextResponse.json({ ok: true, data }, { status });

export const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ ok: false, error: { code, message } }, { status });

/** Throw from anywhere in a handler to return { ok: false, error } */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Wraps a route handler: awaits params, maps HttpError / unexpected errors to JSON. */
export function handle<P = Record<string, never>>(
  fn: (req: NextRequest, params: P) => Promise<Response>
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      return await fn(req, await ctx.params);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.code, err.message);
      console.error("Unhandled API error:", err);
      return fail(500, "INTERNAL", "Internal server error");
    }
  };
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" ? body : {};
}

export function positiveInt(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "BAD_REQUEST", "invalid id");
  return n;
}

/**
 * Resolve the caller from the X-Client-UUID header (or the same-named cookie when
 * allowCookie, for plain link navigations like downloads). Creates the client on first use.
 */
export async function requireClient(req: NextRequest, allowCookie = false) {
  const raw =
    req.headers.get("x-client-uuid") ??
    (allowCookie ? req.cookies.get("X-Client-UUID")?.value : undefined) ??
    "";
  const uuid = raw.trim();
  if (uuid.length < 8 || uuid.length > 64) {
    throw new HttpError(400, "BAD_REQUEST", "missing or invalid X-Client-UUID header");
  }
  const n = now();
  const [row] = await sql`
    insert into clients (uuid, expires_at, created_at)
    values (${uuid}, ${n + CLIENT_TTL_SECONDS}, ${n})
    on conflict (uuid) do update set expires_at = excluded.expires_at
    returning id`;
  return { id: row.id as number, uuid };
}

/** Room the client is a member of, or throws 403. Optionally throws 410 if expired. */
export async function requireMembership(code: string, clientId: number, rejectExpired = true) {
  const [room] = await sql`
    select r.id, r.code, r.name, r.owner_client_id, r.expires_at, rm.role
    from rooms r
    join room_members rm on rm.room_id = r.id
    where r.code = ${code} and rm.client_id = ${clientId}`;
  if (!room) throw new HttpError(403, "FORBIDDEN", "not a room member");
  if (rejectExpired && room.expires_at <= now()) {
    throw new HttpError(410, "ROOM_EXPIRED", "room expired");
  }
  return room as unknown as {
    id: number;
    code: string;
    name: string;
    owner_client_id: number;
    expires_at: number;
    role: string;
  };
}

export const isUniqueViolation = (err: unknown) =>
  (err as { code?: string })?.code === "23505";

/* ---------- Room code / name generation ---------- */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

const ADJECTIVES = [
  "quick", "silent", "bright", "calm", "brave", "fresh", "cool", "smart", "lucky", "wild",
  "mellow", "gentle", "rapid", "steady", "bold", "neat", "clear", "gold", "nova", "happy",
];
const NOUNS = [
  "river", "forest", "cloud", "stone", "bridge", "signal", "comet", "shadow", "ember", "ocean",
  "eagle", "tiger", "lantern", "window", "island", "valley", "rocket", "circle", "pulse", "spark",
];
const pick = (list: string[]) => list[randomInt(list.length)];
const title = (s: string) => s[0].toUpperCase() + s.slice(1);

export function generateRoomName(): string {
  const words = [pick(ADJECTIVES), pick(NOUNS)];
  if (Math.random() < 0.3) words.unshift(pick(ADJECTIVES));
  return words.map(title).join(" ");
}
