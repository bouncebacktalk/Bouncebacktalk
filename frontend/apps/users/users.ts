import { apiDelete, apiGet, apiPatch } from "../api";
import type { CurrentUser } from "../auth/auth";

// A managed member has the same public shape as the signed-in user, so we reuse
// the auth type rather than maintaining a parallel interface.
export type PublicUser = CurrentUser;

export const usersClient = {
  list(search?: string): Promise<PublicUser[]> {
    const term = search?.trim();
    const query = term ? `?search=${encodeURIComponent(term)}` : "";
    return apiGet<PublicUser[]>(`/users${query}`);
  },

  /** Promote (true) or demote (false) a member's admin flag. */
  setAdmin(id: number, isAdmin: boolean): Promise<PublicUser> {
    return apiPatch<PublicUser>(`/users/${id}`, { isAdmin });
  },

  remove(id: number): Promise<void> {
    return apiDelete<void>(`/users/${id}`);
  },

  /** Update the signed-in user's own display name (empty string clears it). */
  updateOwnName(name: string): Promise<PublicUser> {
    return apiPatch<PublicUser>("/users/me", { name });
  },
};
