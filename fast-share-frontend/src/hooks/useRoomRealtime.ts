"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type MessagesSignal = { op: "insert" | "update" | "delete"; id: number; by?: number };
type RoomSignal = { op: "join" | "extend" | "delete" };

interface Handlers {
  onMessages: (signal: MessagesSignal) => void;
  onFiles: () => void;
  onRoom: (signal: RoomSignal) => void;
  /** Subscribed (first time or after a drop): catch up on anything missed. */
  onConnected: () => void;
}

const TYPING_SEND_EVERY_MS = 2500;
const TYPING_SHOW_FOR_MS = 4000;

/**
 * One Supabase Realtime channel per room (`room:<realtime_key>`):
 * - server broadcasts change signals (messages / files / room)
 * - Presence: who has the room open right now
 * - Broadcast "typing": who is typing
 */
export function useRoomRealtime(
  realtimeKey: string | undefined,
  me: { id: number; name: string } | null,
  handlers: Handlers
) {
  const [connected, setConnected] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<number>>(() => new Set());
  const [typing, setTyping] = useState<Record<number, { name: string; until: number }>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSent = useRef(0);
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const meId = me?.id;
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !realtimeKey || meId == null) return;

    const channel = supabase.channel(`room:${realtimeKey}`, {
      config: { presence: { key: String(meId) }, broadcast: { self: false } },
    });

    const stopTyping = (id?: number) =>
      id != null &&
      setTyping((t) => {
        if (!(id in t)) return t;
        const next = { ...t };
        delete next[id];
        return next;
      });

    channel
      .on("broadcast", { event: "messages" }, ({ payload }) => {
        const signal = payload as MessagesSignal;
        if (signal.op === "insert") stopTyping(signal.by);
        handlersRef.current.onMessages(signal);
      })
      .on("broadcast", { event: "files" }, () => handlersRef.current.onFiles())
      .on("broadcast", { event: "room" }, ({ payload }) => handlersRef.current.onRoom(payload as RoomSignal))
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { id, name, stop } = payload as { id: number; name: string; stop?: boolean };
        if (id === meId) return;
        if (stop) stopTyping(id);
        else setTyping((t) => ({ ...t, [id]: { name: String(name).slice(0, 30), until: Date.now() + TYPING_SHOW_FOR_MS } }));
      })
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState()).map(Number)));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          handlersRef.current.onConnected();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnected(false);
        }
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
      setConnected(false);
      setOnlineIds(new Set());
      setTyping({});
    };
  }, [realtimeKey, meId]);

  // Announce presence, and re-announce when my display name changes
  const meName = me?.name;
  useEffect(() => {
    if (connected && meName) channelRef.current?.track({ name: meName });
  }, [connected, meName]);

  // Drop stale "is typing" entries
  const hasTyping = Object.keys(typing).length > 0;
  useEffect(() => {
    if (!hasTyping) return;
    const t = setInterval(() => {
      const now = Date.now();
      setTyping((cur) => {
        const live = Object.entries(cur).filter(([, v]) => v.until > now);
        return live.length === Object.keys(cur).length ? cur : Object.fromEntries(live);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [hasTyping]);

  /** Call on every keystroke; sends at most one "typing" event per 2.5 s. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (!channelRef.current || !me || now - lastTypingSent.current < TYPING_SEND_EVERY_MS) return;
    lastTypingSent.current = now;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { id: me.id, name: me.name } });
  }, [me]);

  /** Call after sending or clearing the composer. */
  const notifyStoppedTyping = useCallback(() => {
    if (!channelRef.current || !me || !lastTypingSent.current) return;
    lastTypingSent.current = 0;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { id: me.id, name: me.name, stop: true } });
  }, [me]);

  const typingNames = Object.values(typing).map((t) => t.name);
  return { connected, onlineIds, typingNames, notifyTyping, notifyStoppedTyping };
}
