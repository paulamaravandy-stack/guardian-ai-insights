import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — OSUSUGUARD AI" },
      { name: "description", content: "Set a new password for your OSUSUGUARD AI account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Could not update password", { description: error.message });
      return;
    }
    toast.success("Password updated", { description: "You can now sign in with your new password." });
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose a strong password for your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="glass space-y-4 rounded-3xl p-8">
          {[
            { label: "New password", value: password, set: setPassword },
            { label: "Confirm password", value: confirm, set: setConfirm },
          ].map(({ label, value, set }) => (
            <label key={label} className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  required
                  type="password"
                  minLength={6}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-secondary/40 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
            </label>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
