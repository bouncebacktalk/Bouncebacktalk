import {
  ApiError,
  apiGet,
  apiPost,
  clearAccessToken,
  rememberAccessToken,
} from "../api";

export interface CurrentUser {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  user: CurrentUser;
  accessToken?: string;
}

export const authClient = {
  me(): Promise<CurrentUser> {
    return apiGet<CurrentUser>("/users/me");
  },

  async login(input: {
    email: string;
    password: string;
  }): Promise<CurrentUser> {
    const response = await apiPost<AuthResponse>("/auth/login", input, {
      skipAuthRefresh: true,
    });
    rememberAccessToken(response.accessToken);
    return response.user;
  },

  async register(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<CurrentUser> {
    const response = await apiPost<AuthResponse>("/auth/register", input, {
      skipAuthRefresh: true,
    });
    rememberAccessToken(response.accessToken);
    return response.user;
  },

  async logout(): Promise<void> {
    await apiPost<void>("/auth/logout", undefined, {
      skipAuthRefresh: true,
    }).finally(() => clearAccessToken());
  },

  /**
   * Change the signed-in user's password. The backend rotates tokens and keeps
   * this device authenticated, so we just refresh the remembered access token.
   */
  async changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<CurrentUser> {
    const response = await apiPost<AuthResponse>(
      "/auth/change-password",
      input,
    );
    rememberAccessToken(response.accessToken);
    return response.user;
  },
};

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
