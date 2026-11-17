import { randomUUID } from "crypto";
import {
  handle, ok, readJson, requireClient, requireMembership, HttpError, MAX_FILE_SIZE,
} from "@/server/api";
import { signUpload } from "@/server/storage";

/**
 * POST /api/rooms/:code/files/upload-url — step 1 of an upload.
 * Body: { size }. Returns a signed storage URL the browser PUTs the file to,
 * then the browser calls POST /api/rooms/:code/files with { key, filename }.
 */
export const POST = handle<{ code: string }>(async (req, { code }) => {
  const client = await requireClient(req);
  const body = await readJson(req);
  const room = await requireMembership(code.trim(), client.id);

  const size = Number(body.size);
  if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, "BAD_REQUEST", "invalid size");
  if (size > MAX_FILE_SIZE) throw new HttpError(413, "TOO_LARGE", "file exceeds 50 MB limit");

  const key = `rooms/${room.code}/${randomUUID()}`;
  return ok(200, { upload_url: await signUpload(key), key });
});
