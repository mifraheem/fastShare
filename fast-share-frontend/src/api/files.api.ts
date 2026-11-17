// src/api/files.api.ts
import { api } from "./http";
import { ApiError, ApiResponse } from "./rooms.api";

/* =========================
   Models
========================= */

export interface FileItem {
  id: number;
  filename: string;
  size: number;
  downloaded: number;
  created_at: number; // unix seconds
  url?: string; // /api/files/:id/download (opens inline)
}

/* ---- Upload ---- */

interface UploadUrlResponse {
  upload_url: string;
  key: string;
}

export interface UploadFileResponse {
  id: number;
  filename: string;
  size: number;
  uploaded_at: number;
}

/* ---- List ---- */

export interface GetRoomFilesResponse {
  files: FileItem[];
}

/* ---- Delete ---- */

export interface DeleteFileResponse {
  status: "deleted";
  id: number;
}

/* =========================
   API Functions
========================= */

/**
 * GET /rooms/:code/files
 */
export function getRoomFiles(roomCode: string) {
  return api<ApiResponse<GetRoomFilesResponse>>(
    `/rooms/${roomCode}/files`
  );
}

/**
 * Upload in three steps so large files skip the server (Vercel caps request bodies at 4.5 MB):
 * 1. POST /rooms/:code/files/upload-url -> signed Supabase Storage URL
 * 2. PUT the file straight to storage
 * 3. POST /rooms/:code/files { key, filename } -> records it in the room
 */
export async function uploadFile(
  roomCode: string,
  file: File
): Promise<ApiResponse<UploadFileResponse>> {
  const signed = await api<ApiResponse<UploadUrlResponse>>(
    `/rooms/${roomCode}/files/upload-url`,
    { method: "POST", body: { size: file.size } }
  );
  if (!signed.ok) return signed as ApiError;

  const upload = await fetch(signed.data.upload_url, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
  });
  if (!upload.ok) {
    const err = await upload.json().catch(() => null);
    throw new Error(err?.message || "Upload to storage failed");
  }

  return api<ApiResponse<UploadFileResponse>>(`/rooms/${roomCode}/files`, {
    method: "POST",
    body: { key: signed.data.key, filename: file.name },
  });
}

/** Same-origin link that checks membership (via cookie) and redirects to a short-lived storage URL */
export function fileDownloadUrl(fileId: number) {
  return `/api/files/${fileId}/download?download=1`;
}

/**
 * DELETE /files/:id
 */
export function deleteFile(fileId: number) {
  return api<ApiResponse<DeleteFileResponse>>(
    `/files/${fileId}`,
    {
      method: "DELETE",
    }
  );
}
