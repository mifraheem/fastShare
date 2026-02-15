// src/hooks/useRooms.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoom,
  joinRoom,
  getJoinedRooms,
  getRoomDetail,
  deleteRoom,
  extendRoom,
  ApiResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  JoinedRoomsResponse,
  RoomDetailResponse,
  DeleteRoomResponse,
  ExtendRoomResponse,
} from "@/api/rooms.api";

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
 * List rooms joined by current client
 */
export function useJoinedRooms(includeExpired = false) {
  return useQuery<JoinedRoomsResponse>({
    queryKey: ["rooms", "joined", includeExpired],
    queryFn: async () => {
      const res = await getJoinedRooms(includeExpired);
      return assertOk(res);
    },
  });
}

/**
 * Get single room detail (for timer: expires_at, expires_in)
 */
export function useRoomDetail(roomCode: string | undefined) {
  return useQuery<RoomDetailResponse>({
    queryKey: ["rooms", roomCode],
    queryFn: async () => {
      if (!roomCode) throw new Error("No room code");
      const res = await getRoomDetail(roomCode);
      return assertOk(res);
    },
    enabled: !!roomCode,
  });
}

/* =========================
   Mutations
========================= */

/**
 * Create room (owner = current client). Pass optional custom name.
 */
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation<CreateRoomResponse, Error, string | undefined>({
    mutationFn: async (name) => {
      const res = await createRoom(name);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", "joined"],
      });
    },
  });
}

/**
 * Join existing room
 */
export function useJoinRoom() {
  const queryClient = useQueryClient();

  return useMutation<JoinRoomResponse, Error, string>({
    mutationFn: async (code: string) => {
      const res = await joinRoom(code);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", "joined"],
      });
    },
  });
}

/**
 * Owner delete room
 */
export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation<DeleteRoomResponse, Error, string>({
    mutationFn: async (code: string) => {
      const res = await deleteRoom(code);
      return assertOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", "joined"],
      });
    },
  });
}

/**
 * Owner extend room lifetime
 */
export function useExtendRoom() {
  const queryClient = useQueryClient();

  return useMutation<
    ExtendRoomResponse,
    Error,
    { code: string; minutes: number }
  >({
    mutationFn: async ({ code, minutes }) => {
      const res = await extendRoom(code, minutes);
      return assertOk(res);
    },
    onSuccess: (_, { code }) => {
      queryClient.invalidateQueries({
        queryKey: ["rooms", "joined"],
      });
      queryClient.invalidateQueries({
        queryKey: ["rooms", code],
      });
    },
  });
}
