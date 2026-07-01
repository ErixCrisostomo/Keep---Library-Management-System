"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Role } from "@/lib/types";

/** Restores the session on mount and exposes auth state + actions. */
export function useAuth() {
  const { user, isLoading, error, login, logout, restoreSession } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    restoreSession().finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, isLoading, error, login, logout, checked };
}

/** Redirects to "/" if there's no authenticated user, or if their role doesn't match. */
export function useRequireRole(requiredRole: Role) {
  const { user, checked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!checked) return;
    if (!user) {
      router.replace("/");
    } else if (user.role !== requiredRole) {
      router.replace(user.role === "librarian" ? "/librarian" : "/student");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, user]);

  return { user, ready: checked && !!user && user.role === requiredRole };
}
