// src/hooks/useFiles.ts

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getRoomFiles,
  uploadFile,
  deleteFile,
  fileDownloadUrl,
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
export function useRoomFiles(roomCode: string, { live }: { live: boolean }) {
  return useQuery<GetRoomFilesResponse>({
    queryKey: ["rooms", roomCode, "files"],
    queryFn: async () => {
      const res = await getRoomFiles(roomCode);
      return assertOk(res);
    },
    enabled: !!roomCode,
    // Realtime signals refresh this; poll slowly only while disconnected
    refetchInterval: live ? false : 10_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
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
 * Download a file. A plain navigation (not fetch): the API redirects to a signed storage URL
 * with "Content-Disposition: attachment", so the browser saves it and stays on the page.
 * No CORS needed and the file never sits in JS memory.
 */
export function useDownloadFile() {
  return async (fileId: number, _filename?: string, _fileUrl?: string) => {
    window.location.assign(fileDownloadUrl(fileId));
  };
}
