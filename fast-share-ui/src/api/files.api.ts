// src/api/files.api.ts
import { api } from "./http";
import { ApiResponse } from "./rooms.api";

/* =========================
   Models
========================= */

export interface FileItem {
  id: number;
  filename: string;
  size: number;
  downloaded: number;
  created_at: number; // unix seconds
}

/* ---- Upload ---- */

export interface UploadFileResponse {
  id: number;
  filename: string;
  size: number;
  path: string;
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
 * POST /rooms/:code/files
 * multipart/form-data
 */
export function uploadFile(roomCode: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return api<ApiResponse<UploadFileResponse>>(
    `/rooms/${roomCode}/files`,
    {
      method: "POST",
      body: formData,
    }
  );
}

/**
 * GET /files/:id/download
 * binary stream
 */
export async function downloadFile(fileId: number) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/files/${fileId}/download`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to download file");
  }

  return res;
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
