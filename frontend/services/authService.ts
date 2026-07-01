import { api } from "./api";
import { AuthUser } from "@/lib/types";

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export const authService = {
  login: (login_id: string, password: string) =>
    api.post<TokenResponse>("/api/auth/login", { login_id, password }),
  me: () => api.get<AuthUser>("/api/auth/me"),
};
