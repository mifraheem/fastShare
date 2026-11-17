import { createClient } from "@supabase/supabase-js";

/**
 * File storage on Supabase Storage (private bucket "room-files").
 * Uses the secret key, so this module must only ever run on the server.
 */
const supabase = createClient(
  process.env.SUPABASE_URL ?? "http://localhost",
  process.env.SUPABASE_SECRET_KEY ?? "missing",
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const bucket = () => supabase.storage.from("room-files");

/** URL the browser PUTs the file to (valid 2 hours, single object, no overwrite). */
export async function signUpload(key: string) {
  const { data, error } = await bucket().createSignedUploadUrl(key);
  if (error) throw error;
  return data.signedUrl;
}

/** Size of an uploaded file, or null if it doesn't exist. */
export async function getUploaded(key: string) {
  const { data, error } = await bucket().info(key);
  if (error) {
    const e = error as { status?: number; statusCode?: string | number; code?: string };
    if (e.code === "NoSuchKey" || e.status === 404 || String(e.statusCode) === "404") return null;
    throw error;
  }
  return { size: Number(data.size ?? 0) };
}

/** 5-minute download URL. With a filename, the browser saves it under that name. */
export async function signedDownloadUrl(key: string, downloadAs?: string) {
  const { data, error } = await bucket().createSignedUrl(key, 300, downloadAs ? { download: downloadAs } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/** Delete everything stored for a room, including uploads that were never recorded. */
export async function deleteRoomFolder(code: string) {
  const { data, error } = await bucket().list(`rooms/${code}`, { limit: 1000 });
  if (error) throw error;
  await deleteUploaded(data.map((f) => `rooms/${code}/${f.name}`));
  return data.length;
}

/** Best-effort delete; a leftover file is cheaper than a failed request. */
export async function deleteUploaded(keys: string[]) {
  if (keys.length === 0) return;
  const { error } = await bucket().remove(keys);
  if (error) console.error("Storage delete failed:", keys, error);
}
