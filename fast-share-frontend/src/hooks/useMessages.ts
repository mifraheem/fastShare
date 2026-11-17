// src/hooks/useMessages.ts
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import {
  sendMessage,
  getRoomMessages,
  updateMessage,
  deleteMessage,
  Message,
  SendMessageResponse,
  UpdateMessageResponse,
  DeleteMessageResponse,
  GetMessagesResponse,
} from "@/api/messages.api";
import { ApiResponse } from "@/api/rooms.api";

/** A message shown before the server confirms it (negative id). */
export type ChatMessageItem = Message & { pending?: boolean };
type MessagesData = { messages: ChatMessageItem[] };

function assertOk<T>(res: ApiResponse<T>): T {
  if (res.ok === false) throw new Error(res.error.message);
  return res.data;
}

let tempSeq = 0;
const messagesKey = (roomCode: string) => ["rooms", roomCode, "messages"] as const;

function setMessages(qc: QueryClient, roomCode: string, fn: (list: ChatMessageItem[]) => ChatMessageItem[]) {
  qc.setQueryData<MessagesData>(messagesKey(roomCode), (old) => ({ messages: fn(old?.messages ?? []) }));
}

/** Merge by id (server copy wins) and keep chronological order; pending ones stay last. */
function merge(list: ChatMessageItem[], incoming: Message[]): ChatMessageItem[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => {
    if (a.id < 0 && b.id < 0) return b.id - a.id; // temp ids are -(send order), so older first
    if (a.id < 0 || b.id < 0) return a.id < 0 ? 1 : -1;
    return a.id - b.id;
  });
}

/* =========================
   Query
========================= */

/**
 * Latest 100 messages for a room, kept current by realtime signals.
 * `live` = realtime connected; while disconnected, fall back to slow polling.
 */
export function useRoomMessages(roomCode: string, { live }: { live: boolean }) {
  const qc = useQueryClient();

  const query = useQuery<MessagesData>({
    queryKey: messagesKey(roomCode),
    queryFn: async () => {
      const data = assertOk<GetMessagesResponse>(await getRoomMessages(roomCode, { limit: 100 }));
      // Keep any of my messages still in flight
      const pending = (qc.getQueryData<MessagesData>(messagesKey(roomCode))?.messages ?? []).filter((m) => m.pending);
      return { messages: [...data.messages, ...pending] };
    },
    enabled: !!roomCode,
    refetchInterval: live ? false : 5000,
    refetchOnWindowFocus: true,
  });

  /** Fetch only messages newer than the newest confirmed one we have. */
  const fetchNewer = useCallback(async () => {
    if (!roomCode) return;
    const list = qc.getQueryData<MessagesData>(messagesKey(roomCode))?.messages ?? [];
    const after = list.reduce((max, m) => (m.id > max ? m.id : max), 0);
    if (!after) return void qc.invalidateQueries({ queryKey: messagesKey(roomCode) });
    try {
      const data = assertOk<GetMessagesResponse>(await getRoomMessages(roomCode, { after, limit: 100 }));
      if (data.messages.length) setMessages(qc, roomCode, (cur) => merge(cur, data.messages));
    } catch {
      qc.invalidateQueries({ queryKey: messagesKey(roomCode) });
    }
  }, [qc, roomCode]);

  const resync = useCallback(() => qc.invalidateQueries({ queryKey: messagesKey(roomCode) }), [qc, roomCode]);

  return { ...query, fetchNewer, resync };
}

/* =========================
   Mutations (optimistic for my own actions)
========================= */

export function useSendMessage(roomCode: string, me: { id: number; name: string } | null) {
  const qc = useQueryClient();

  return useMutation<SendMessageResponse, Error, string, { tempId: number }>({
    mutationFn: async (content) => assertOk(await sendMessage(roomCode, content)),
    onMutate: (content) => {
      const tempId = -++tempSeq;
      setMessages(qc, roomCode, (list) => [
        ...list,
        {
          id: tempId,
          sender_client_id: me?.id ?? 0,
          sender_name: me?.name,
          content,
          created_at: Math.floor(Date.now() / 1000),
          mine: true,
          pending: true,
        },
      ]);
      return { tempId };
    },
    onSuccess: (res, _content, ctx) => {
      setMessages(qc, roomCode, (list) => {
        const confirmed = list.map((m) =>
          m.id === ctx?.tempId ? { ...m, id: res.id, created_at: res.created_at, pending: false } : m
        );
        return merge([], confirmed); // dedupe if the realtime catch-up already added it
      });
    },
    onError: (_err, _content, ctx) => {
      setMessages(qc, roomCode, (list) => list.filter((m) => m.id !== ctx?.tempId));
    },
  });
}

export function useUpdateMessage(roomCode: string) {
  const qc = useQueryClient();
  return useMutation<UpdateMessageResponse, Error, { id: number; content: string }>({
    mutationFn: async ({ id, content }) => assertOk(await updateMessage(id, content)),
    onSuccess: (_res, { id, content }) =>
      setMessages(qc, roomCode, (list) => list.map((m) => (m.id === id ? { ...m, content } : m))),
  });
}

export function useDeleteMessage(roomCode: string) {
  const qc = useQueryClient();
  return useMutation<DeleteMessageResponse, Error, number>({
    mutationFn: async (id) => assertOk(await deleteMessage(id)),
    onSuccess: (_res, id) => setMessages(qc, roomCode, (list) => list.filter((m) => m.id !== id)),
  });
}
