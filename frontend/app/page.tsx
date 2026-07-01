"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoginScreen } from "@/components/LoginScreen";

export default function HomePage() {
  const { user, checked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (checked && user) {
      router.replace(user.role === "librarian" ? "/librarian" : "/student");
    }
  }, [checked, user, router]);

  if (checked && user) return null; // redirecting
  return <LoginScreen />;
}
