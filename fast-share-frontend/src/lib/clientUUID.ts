import { v4 as uuidv4 } from "uuid";

const COOKIE_NAME = "X-Client-UUID";
const COOKIE_MAX_AGE_DAYS = 365 * 5; // 5 years

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Ensures the client has a persistent UUID stored in cookies.
 * Returns the UUID.
 */
export function ensureClientUUID(): string {
  let uuid = getCookie(COOKIE_NAME);

  if (!uuid) {
    uuid = uuidv4();
    setCookie(COOKIE_NAME, uuid, COOKIE_MAX_AGE_DAYS);
    console.log("Generated new client UUID:", uuid);
  }

  return uuid;
}
