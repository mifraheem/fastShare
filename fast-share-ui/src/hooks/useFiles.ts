// src/hooks/useFiles.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRoomFiles,
  uploadFile,
  deleteFile,
  downloadFile,
  FileItem,
  GetRoomFilesResponse,
  UploadFileResponse,
  DeleteFileResponse,
} from "@/api/files.api";
import { ApiResponse } from "@/api/rooms.api";

/* =========================
   Helpers
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
 * List all files for a room
 */
export function useRoomFiles(roomCode: string) {
  return useQuery<GetRoomFilesResponse>({
    queryKey: ["rooms", roomCode, "files"],
    queryFn: async () => {
      const res = await getRoomFiles(roomCode);
      return assertOk(res);
    },
    enabled: !!roomCode,
  });
}

/* =========================
   Mutations
========================= */

/**
 * Upload a file to a room
 */
export function useUploadFile(roomCode: string) {
  const queryClient = useQueryClient();

  return useMutation<UploadFileResponse, Error, File>({
    mutationFn: async (file: File) => {
      const res = await uploadFile(roomCode, file);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", roomCode, "files"],
      });
    },
  });
}

/**
 * Delete a file (owner / admin only)
 */
export function useDeleteFile(roomCode: string) {
  const queryClient = useQueryClient();

  return useMutation<DeleteFileResponse, Error, number>({
    mutationFn: async (fileId: number) => {
      const res = await deleteFile(fileId);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", roomCode, "files"],
      });
    },
  });
}

/**
 * Download a file
 * (binary stream, no React Query cache)
 */
export function useDownloadFile() {
  return async (fileId: number, filename: string) => {
    const res = await downloadFile(fileId);
    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);
  };
}
