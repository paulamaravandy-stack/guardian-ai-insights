import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Mail, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — OSUSUGUARD AI" },
      { name: "description", content: "Sign in to the OSUSUGUARD AI fraud detection platform." },
      { property: "og:title", content: "Sign in — OSUSUGUARD AI" },
      { property: "og:description", content: "Sign in to the OSUSUGUARD AI fraud detection platform." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register" | "forgot";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created", {
          description: "Check your email to confirm your account, then sign in.",
        });
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent", { description: "Check your email for the password reset link." });
        setMode("login");
      }
    } catch (err) {
      toast.error("Authentication failed", { description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 animate-pulse-glow">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold">
            OSUSU<span className="text-gradient-emerald">GUARD AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Explainable AI fraud detection for community savings groups
          </p>
        </div>

        <div className="glass rounded-3xl p-8">
          <div className="mb-6 flex rounded-xl bg-secondary/60 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Full name</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aminata Sesay"
                    className="w-full rounded-xl border border-input bg-secondary/40 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email address</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-input bg-secondary/40 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
                />
              </div>
            </label>
            {mode !== "forgot" && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-input bg-secondary/40 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in to platform"
                  : mode === "register"
                    ? "Create account"
                    : "Send reset link"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {mode === "login" && (
            <button
              onClick={() => setMode("forgot")}
              className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Forgot your password?
            </button>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => setMode("login")}
              className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Back to sign in
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by multi-source verification & explainable AI
        </p>
      </div>
    </div>
  );
}
