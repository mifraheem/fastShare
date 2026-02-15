// src/api/rooms.api.ts
import { api } from "./http";

/* =========================
   Common API Response Types
========================= */

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/* =========================
   Room Models
========================= */

export interface RoomBase {
  code: string;
  name: string;
  expires_at: number;
  expires_in: number;
}

/* ---- Create Room ---- */

export interface CreateRoomResponse extends RoomBase {
  owner: true;
  created_at: number;
  updated_at: number;
  owner_client_id: number;
}

/* ---- Join Room ---- */

export interface JoinRoomResponse {
  status: "joined";
  code: string;
  name: string;
  expires_at: number;
  expires_in: number;
}

/* ---- Joined Rooms ---- */

export interface JoinedRoom {
  code: string;
  name: string;
  role: "owner" | "member";
  joined_at: number;
  owner: boolean;
  expires_at: number;
  expires_in: number;
  created_at: number;
  updated_at: number;
  expired: boolean;
}

export interface JoinedRoomsResponse {
  rooms: JoinedRoom[];
}

/* ---- Room Detail (GET /rooms/:code) ---- */

export interface RoomDetailMember {
  id: number;
  name: string;
  role: string;
  joined_at: number;
  me: boolean;
}

export interface RoomDetailResponse {
  code: string;
  name: string;
  owner: boolean;
  expires_at: number;
  expires_in: number;
  expired: boolean;
  created_at: number;
  updated_at: number;
  members: RoomDetailMember[];
  member_count: number;
}

/* ---- Delete Room ---- */

export interface DeleteRoomResponse {
  status: "deleted";
  code: string;
}

/* ---- Extend Room ---- */

export interface ExtendRoomResponse {
  status: "extended";
  code: string;
  name: string;
  old_expires: number;
  expires_at: number;
  expires_in: number;
  added_minutes: number;
}

/* =========================
   API Functions
========================= */

/**
 * POST /rooms
 * Optional body: { name: string } for custom room name
 */
export function createRoom(name?: string) {
  return api<ApiResponse<CreateRoomResponse>>("/rooms", {
    method: "POST",
    body: name != null && name.trim() !== "" ? { name: name.trim() } : undefined,
  });
}

/**
 * POST /rooms/:code/join
 */
export function joinRoom(code: string) {
  return api<ApiResponse<JoinRoomResponse>>(`/rooms/${code}/join`, {
    method: "POST",
  });
}

/**
 * GET /rooms/joined
 */
export function getJoinedRooms(includeExpired = false) {
  const query = includeExpired ? "?include_expired=true" : "";
  return api<ApiResponse<JoinedRoomsResponse>>(`/rooms/joined${query}`);
}

/**
 * GET /rooms/:code - room detail (includes expires_at, expires_in for timer)
 */
export function getRoomDetail(roomCode: string) {
  return api<ApiResponse<RoomDetailResponse>>(`/rooms/${roomCode}`);
}

/**
 * DELETE /rooms/:code
 */
export function deleteRoom(code: string) {
  return api<ApiResponse<DeleteRoomResponse>>(`/rooms/${code}`, {
    method: "DELETE",
  });
}

/**
 * POST /rooms/:code/extend
 */
export function extendRoom(code: string, minutes: number) {
  return api<ApiResponse<ExtendRoomResponse>>(`/rooms/${code}/extend`, {
    method: "POST",
    body: { minutes },
  });
}
