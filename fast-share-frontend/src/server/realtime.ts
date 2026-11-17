/**
 * Tell everyone in a room that something changed, via Supabase Realtime broadcast
 * on channel `room:<realtime_key>`. Payloads are signals only ("messages changed"),
 * never content: browsers re-fetch through the API, which checks membership.
 */
export type RoomEvent =
  | { event: "messages"; payload: { op: "insert" | "update" | "delete"; id: number; by?: number } }
  | { event: "files"; payload: Record<string, never> }
  | { event: "room"; payload: { op: "join" | "extend" | "delete" } };

export async function notifyRoom(realtimeKey: string, e: RoomEvent): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || !realtimeKey) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic: `room:${realtimeKey}`, event: e.event, payload: e.payload, private: false }],
      }),
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    // Best effort: clients also re-sync on reconnect and via a slow fallback poll
    console.error("Realtime notify failed:", e.event, err);
  }
}
