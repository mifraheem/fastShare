import { ensureClientUUID } from "@/lib/clientUUID";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const uuid = ensureClientUUID();

  const headers: Record<string, string> = {
    "X-Client-UUID": uuid,
    ...(options.headers as Record<string, string>),
  };

  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    // ✅ multipart upload
    body = options.body;
    // DO NOT set Content-Type
  } else if (typeof options.body === "string") {
    // ✅ plain text (messages)
    headers["Content-Type"] = "text/plain";
    body = options.body;
  } else if (options.body !== undefined) {
    // ✅ JSON (rooms, etc.)
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const err = await res.json();
      throw new Error(err?.error?.message || "API request failed");
    }
    throw new Error(await res.text());
  }

  if (contentType.includes("application/json")) {
    return res.json();
  }

  // for downloads or empty responses
  return undefined as T;
}
