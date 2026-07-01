import { create } from "zustand";
import { AuthUser } from "@/lib/types";
import { authService } from "@/services/authService";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (loginId: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (loginId, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login(loginId, password);
      localStorage.setItem("keep_token", res.access_token);
      set({ user: res.user, isLoading: false });
      return res.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("keep_token");
    set({ user: null });
  },

  restoreSession: async () => {
    const token = localStorage.getItem("keep_token");
    if (!token) return;
    try {
      const user = await authService.me();
      set({ user });
    } catch {
      localStorage.removeItem("keep_token");
      set({ user: null });
    }
  },
}));
