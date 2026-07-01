"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, XCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const user = await login(identifier.trim(), password);
      router.push(user.role === "librarian" ? "/librarian" : "/student");
    } catch {
      setError("Invalid credentials. Please check your Email or Student Number and password.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-24 h-24 items-center justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keep-logo.png" alt="Keep logo" className="w-24 h-24 object-contain" style={{ mixBlendMode: "multiply" }} />
          </div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight font-serif">Keep</h1>
          <p className="text-sm text-muted-foreground mt-1">Library Management System</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Email or Student Number</label>
              <input autoFocus
                className="w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                placeholder="juandelacruz@email.com or 22-22222"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"}
                  className="w-full px-3 py-2.5 pr-10 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30"
                  placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {error && <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><XCircle size={13} className="shrink-0 mt-0.5" />{error}</div>}
            <button type="submit" disabled={isLoading}
              className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
        <div className="mt-4 p-3 bg-muted/60 border border-border rounded-xl text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-1.5">Demo credentials</div>
          <div className="flex flex-col gap-1 font-mono">
            <div><span className="text-primary">Librarian:</span> juandelacruz@email.com · lib123</div>
            <div><span className="text-primary">Student:</span> 22-22222 · student1</div>
          </div>
        </div>
      </div>
    </div>
  );
}
