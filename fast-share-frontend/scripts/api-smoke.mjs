// End-to-end check of the API against a running server (local or deployed).
// Usage: node scripts/api-smoke.mjs [baseUrl]   (default http://localhost:8081)
// Creates and then deletes its own room, messages and file.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const BASE = (process.argv[2] ?? "http://localhost:8081").replace(/\/$/, "");
const owner = randomUUID(), member = randomUUID(), outsider = randomUUID();

async function call(uuid, method, path, body, { cookie = false } = {}) {
  const headers = {};
  if (uuid && !cookie) headers["X-Client-UUID"] = uuid;
  if (uuid && cookie) headers["Cookie"] = `X-Client-UUID=${uuid}`;
  if (typeof body === "string") headers["Content-Type"] = "text/plain";
  else if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + "/api" + path, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  const json = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  return { status: res.status, json, location: res.headers.get("location") };
}
const step = (name) => console.log("✓", name);

// --- health / identity ---
assert.equal((await call(null, "GET", "/health")).status, 200); step("health");
assert.equal((await call(null, "GET", "/rooms/joined")).status, 400); step("missing client uuid -> 400");
assert.deepEqual((await call(owner, "PUT", "/me", { name: "OwnerName-TooLongForSure" })).json.data, { name: "OwnerName-TooLo" });
await call(member, "PUT", "/me", { name: "Member" });
step("PUT /me trims to 15 chars");

// --- rooms ---
const created = await call(owner, "POST", "/rooms", { name: "Smoke Test" });
assert.equal(created.status, 201);
const code = created.json.data.code;
assert.equal(created.json.data.owner, true);
assert.equal(created.json.data.expires_in, 3000);
step(`create room ${code}`);

assert.equal((await call(owner, "GET", "/rooms/joined")).json.data.rooms[0].code, code); step("joined rooms");
assert.equal((await call(member, "GET", `/rooms/${code}`)).status, 403); step("detail before join -> 403");
assert.equal((await call(member, "GET", "/rooms/NOPE99")).status, 404); step("unknown room -> 404");
assert.equal((await call(member, "POST", "/rooms/NOPE99/join")).status, 404);
assert.equal((await call(member, "POST", `/rooms/${code}/join`)).json.data.status, "joined");
assert.equal((await call(member, "POST", `/rooms/${code}/join`)).status, 200); step("join (idempotent)");

const detail = (await call(member, "GET", `/rooms/${code}`)).json.data;
assert.equal(detail.member_count, 2);
assert.equal(detail.owner, false);
assert.deepEqual(detail.members.map((m) => [m.name, m.role, m.me]), [["OwnerName-TooLo", "owner", false], ["Member", "member", true]]);
assert.match(detail.realtime_key, /^[0-9a-f-]{36}$/);
step("detail with members (+ realtime key for members only)");

assert.equal((await call(member, "POST", `/rooms/${code}/extend`, { minutes: 5 })).status, 403);
assert.equal((await call(owner, "POST", `/rooms/${code}/extend`, { minutes: 0 })).status, 400);
const ext = (await call(owner, "POST", `/rooms/${code}/extend`, { minutes: 5 })).json.data;
assert.equal(ext.expires_at - ext.old_expires, 300); step("extend (owner only, 1-60 min)");

// --- messages ---
assert.equal((await call(outsider, "POST", `/rooms/${code}/messages`, "hi")).status, 403);
assert.equal((await call(owner, "POST", `/rooms/${code}/messages`, "   ")).status, 400);
const m1 = (await call(owner, "POST", `/rooms/${code}/messages`, "<b>hello</b>")).json.data;
const m2 = (await call(member, "POST", `/rooms/${code}/messages`, "hey")).json.data;
const list = (await call(member, "GET", `/rooms/${code}/messages`)).json.data.messages;
assert.deepEqual(list.map((m) => [m.content, m.sender_name, m.mine]), [["<b>hello</b>", "OwnerName-TooLo", false], ["hey", "Member", true]]);
assert.equal((await call(member, "GET", `/rooms/${code}/messages?after=${m1.id}`)).json.data.messages.length, 1);
// Without `after`, the latest N come back (oldest first): limit=1 must return the newest message
assert.deepEqual((await call(member, "GET", `/rooms/${code}/messages?limit=1`)).json.data.messages.map((m) => m.content), ["hey"]);
step("send / list latest / after");

assert.equal((await call(member, "PUT", `/messages/${m1.id}`, "hacked")).status, 403);
assert.equal((await call(owner, "PUT", `/messages/${m1.id}`, "edited")).json.data.status, "updated");
assert.equal((await call(owner, "PUT", "/messages/abc", "x")).status, 400);
assert.equal((await call(member, "DELETE", `/messages/${m1.id}`)).status, 403);
assert.deepEqual((await call(owner, "DELETE", `/messages/${m2.id}`)).json.data, { status: "deleted", by: "admin" });
assert.deepEqual((await call(owner, "DELETE", `/messages/${m1.id}`)).json.data, { status: "deleted" });
step("edit own only; delete own or as owner");

// --- files ---
const payload = "fastshare smoke " + randomUUID();
const tooBig = await call(member, "POST", `/rooms/${code}/files/upload-url`, { size: 51 * 1024 * 1024 });
assert.equal(tooBig.status, 413);
assert.equal((await call(outsider, "POST", `/rooms/${code}/files/upload-url`, { size: 1 })).status, 403);
const signed = (await call(member, "POST", `/rooms/${code}/files/upload-url`, {
  size: Buffer.byteLength(payload),
})).json.data;
assert.match(signed.key, new RegExp(`^rooms/${code}/[0-9a-f-]{36}$`));
step("upload-url (50 MB limit, members only)");

const finalize = { key: signed.key, filename: "../../evil/notes.txt" };
assert.equal((await call(member, "POST", `/rooms/${code}/files`, finalize)).status, 400); // not uploaded yet
const up = await fetch(signed.upload_url, {
  method: "PUT", body: payload, headers: { "Content-Type": "text/plain", "x-upsert": "false" },
});
assert.ok(up.ok, `upload to storage failed: ${up.status} ${await up.text()}`);
assert.equal((await call(member, "POST", `/rooms/${code}/files`, { ...finalize, key: `rooms/OTHER1/${randomUUID()}` })).status, 400);
const rec = await call(member, "POST", `/rooms/${code}/files`, finalize);
assert.equal(rec.status, 201);
assert.equal(rec.json.data.size, Buffer.byteLength(payload));
assert.equal(rec.json.data.filename, "notes.txt");
assert.equal((await call(member, "POST", `/rooms/${code}/files`, finalize)).status, 409);
const fileId = rec.json.data.id;
step("direct upload to storage + record (key checked, filename sanitized, no duplicates)");

const files = (await call(owner, "GET", `/rooms/${code}/files`)).json.data.files;
assert.deepEqual(files.map((f) => [f.id, f.filename, f.url]), [[fileId, "notes.txt", `/api/files/${fileId}/download`]]);
step("list files");

const dl = await call(owner, "GET", `/files/${fileId}/download?download=1`, undefined, { cookie: true });
assert.equal(dl.status, 302);
const fetched = await fetch(dl.location);
assert.equal(await fetched.text(), payload);
assert.match(fetched.headers.get("content-disposition") ?? "", /attachment.*notes\.txt/);
assert.equal((await call(outsider, "GET", `/files/${fileId}/download`)).status, 404);
assert.equal((await call(owner, "GET", `/rooms/${code}/files`)).json.data.files[0].downloaded, 1);
step("download via cookie -> signed storage URL with filename, members only, counted");

assert.equal((await call(member, "DELETE", `/files/${fileId}`)).status, 403);
assert.equal((await call(owner, "DELETE", `/files/${fileId}`)).status, 200);
// Links already handed out may be served from CDN cache until they expire (5 min); new ones are refused.
// Removal from storage is proven below: the room delete finds only the orphan upload.
assert.equal((await call(owner, "GET", `/files/${fileId}/download`)).status, 404);
step("delete file (owner/admin only, object removed)");

// --- delete room (also removes uploads that were never recorded) ---
const orphan = (await call(member, "POST", `/rooms/${code}/files/upload-url`, { size: 3 })).json.data;
await fetch(orphan.upload_url, { method: "PUT", body: "abc", headers: { "Content-Type": "text/plain" } });
assert.equal((await call(member, "DELETE", `/rooms/${code}`)).status, 403);
assert.deepEqual((await call(owner, "DELETE", `/rooms/${code}`)).json.data, { status: "deleted", code, files_deleted: 1 });
assert.equal((await call(owner, "GET", `/rooms/${code}`)).status, 404);
step("delete room (owner only, stored files removed)");

// --- cleanup cron ---
assert.equal((await call(null, "GET", "/cron/cleanup")).status, 401);
step("cleanup cron rejects unauthenticated calls");

console.log("\nAll API checks passed against", BASE);
