/**
 * Client-side authentication store (Zustand)
 *
 * This store holds the currently authenticated user and exposes actions to
 * - `login`: authenticate and persist token
 * - `logout`: clear session and notify backend (best-effort)
 * - `restoreSession`: attempt to rehydrate session from `localStorage`
 */
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
      // Persist token for subsequent API requests and session restore
      localStorage.setItem("keep_token", res.access_token);
      // Store user profile in memory (Zustand store)
      set({ user: res.user, isLoading: false });
      return res.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed.";
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    // On logout, attempt to notify the server so it can create an audit
    // entry. We do this as "best-effort" — failures are ignored because the
    // local user experience should not depend on audit success.
    try {
      void authService.logout();
    } catch {
      // ignore network errors
    }
    // Clear local session state so the UI returns to unauthenticated view
    localStorage.removeItem("keep_token");
    set({ user: null });
  },

  restoreSession: async () => {
    // Attempt to rehydrate the current user from the persisted token.
    // If the token is invalid or the API call fails, we clear the token.
    const token = localStorage.getItem("keep_token");
    if (!token) return;
    try {
      const user = await authService.me();
      set({ user });
    } catch {
      // Invalid/expired token: remove and reset state
      localStorage.removeItem("keep_token");
      set({ user: null });
    }
  },
}));
