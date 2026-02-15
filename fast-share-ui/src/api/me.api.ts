import { api } from "./http";
import { ApiResponse } from "./rooms.api";

export interface PutMeResponse {
  name: string;
}

/**
 * PUT /me - Set or update current client display name (max 15 chars on backend).
 */
export function putMe(name: string) {
  return api<ApiResponse<PutMeResponse>>("/me", {
    method: "PUT",
    body: { name: name.trim().slice(0, 15) },
  });
}
