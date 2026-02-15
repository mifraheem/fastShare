// src/hooks/useMessages.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/* =========================
   Helper
========================= */

function assertOk<T>(res: ApiResponse<T>): T {
  if (res.ok === false) {
    throw new Error(res.error.message);
  }
  return res.data;
}

/* =========================
   Queries
========================= */

/**
 * Get messages for a room
 */
export function useRoomMessages(
  roomCode: string,
  options?: { after?: number; limit?: number }
) {
  return useQuery<GetMessagesResponse>({
    queryKey: ["rooms", roomCode, "messages", options],
    queryFn: async () => {
      const res = await getRoomMessages(roomCode, options);
      return assertOk(res);
    },
    enabled: !!roomCode,
  });
}

/* =========================
   Mutations
========================= */

/**
 * Send message
 */
export function useSendMessage(roomCode: string) {
  const queryClient = useQueryClient();

  return useMutation<SendMessageResponse, Error, string>({
    mutationFn: async (content: string) => {
      const res = await sendMessage(roomCode, content);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", roomCode, "messages"],
      });
    },
  });
}

/**
 * Update own message
 */
export function useUpdateMessage(roomCode: string) {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateMessageResponse,
    Error,
    { id: number; content: string }
  >({
    mutationFn: async ({ id, content }) => {
      const res = await updateMessage(id, content);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", roomCode, "messages"],
      });
    },
  });
}

/**
 * Delete message
 */
export function useDeleteMessage(roomCode: string) {
  const queryClient = useQueryClient();

  return useMutation<DeleteMessageResponse, Error, number>({
    mutationFn: async (id: number) => {
      const res = await deleteMessage(id);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", roomCode, "messages"],
      });
    },
  });
}
