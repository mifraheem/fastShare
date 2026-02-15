// src/api/messages.api.ts
import { api } from "./http";
import { ApiResponse } from "./rooms.api";

/* =========================
   Models
========================= */

export interface Message {
  id: number;
  sender_client_id: number;
  sender_name?: string; // display name from backend (for all members)
  content: string;
  created_at: number; // unix seconds
  mine?: boolean;
}

/* ---- Send Message ---- */

export interface SendMessageResponse {
  id: number;
  content: string;
  created_at: number;
}

/* ---- Get Messages ---- */

export interface GetMessagesResponse {
  messages: Message[];
}

/* ---- Update Message ---- */

export interface UpdateMessageResponse {
  id: number;
  status: "updated";
}

/* ---- Delete Message ---- */

export interface DeleteMessageResponse {
  status: "deleted";
  by?: "admin";
}

/* =========================
   API Functions
========================= */

/**
 * POST /rooms/:code/messages
 * Body: plain text
 */
export function sendMessage(roomCode: string, content: string) {
  return api<ApiResponse<SendMessageResponse>>(
    `/rooms/${roomCode}/messages`,
    {
      method: "POST",
      body: content, // ⚠️ raw text
      headers: {
        "Content-Type": "text/plain",
      },
    }
  );
}

/**
 * GET /rooms/:code/messages
 */
export function getRoomMessages(
  roomCode: string,
  options?: { after?: number; limit?: number }
) {
  const params = new URLSearchParams();

  if (options?.after) params.set("after", String(options.after));
  if (options?.limit) params.set("limit", String(options.limit));

  const query = params.toString();
  const url = query
    ? `/rooms/${roomCode}/messages?${query}`
    : `/rooms/${roomCode}/messages`;

  return api<ApiResponse<GetMessagesResponse>>(url);
}

/**
 * PUT /messages/:id
 * Body: plain text
 */
export function updateMessage(messageId: number, content: string) {
  return api<ApiResponse<UpdateMessageResponse>>(
    `/messages/${messageId}`,
    {
      method: "PUT",
      body: content,
      headers: {
        "Content-Type": "text/plain",
      },
    }
  );
}

/**
 * DELETE /messages/:id
 */
export function deleteMessage(messageId: number) {
  return api<ApiResponse<DeleteMessageResponse>>(
    `/messages/${messageId}`,
    {
      method: "DELETE",
    }
  );
}
