import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserX, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatDate, riskLevelFromScore, riskStyles } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "Member Management — OSUSUGUARD AI" },
      { name: "description", content: "Manage Osusu group members, risk profiles, and contribution history." },
    ],
  }),
  component: MembersPage,
});

function MembersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await supabase.from("members").select("*").order("full_name")).data ?? [],
  });

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("members").insert({ full_name: fullName, phone });
    setSaving(false);
    if (error) {
      toast.error("Could not add member", { description: error.message });
      return;
    }
    await supabase.from("audit_logs").insert({
      actor_name: "You", action: "added_member", entity_type: "member", entity_ref: fullName, details: "New member registered",
    });
    toast.success("Member added");
    setShowForm(false);
    setFullName(""); setPhone("");
    queryClient.invalidateQueries({ queryKey: ["members"] });
  }

  async function toggleStatus(id: string, current: string, name: string) {
    const next = current === "active" ? "suspended" : "active";
    const { error } = await supabase.from("members").update({ status: next }).eq("id", id);
    if (error) {
      toast.error("Could not update member", { description: error.message });
      return;
    }
    await supabase.from("audit_logs").insert({
      actor_name: "You", action: next === "suspended" ? "suspended_member" : "reactivated_member", entity_type: "member", entity_ref: name,
      details: `Member status changed to ${next}`,
    });
    toast.success(`Member ${next}`);
    queryClient.invalidateQueries({ queryKey: ["members"] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Member Management"
        subtitle="Member profiles, risk scores, and status control"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Add Member
          </button>
        }
      />

      {showForm && (
        <form onSubmit={addMember} className="glass mb-6 grid gap-4 rounded-2xl p-6 sm:grid-cols-3 animate-fade-up">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name"
            className="rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number"
            className="rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button disabled={saving} className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60">
            {saving ? "Saving…" : "Add member"}
          </button>
        </form>
      )}

      <div className="glass overflow-hidden rounded-2xl animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Risk Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((m) => {
                const level = riskLevelFromScore(m.risk_score);
                return (
                  <tr key={m.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {m.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium">{m.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{m.phone ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(m.joined_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskStyles[level]}`}>
                        {m.risk_score} · {level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${m.status === "active" ? "text-primary" : "text-destructive"}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleStatus(m.id, m.status, m.full_name)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title={m.status === "active" ? "Suspend" : "Reactivate"}
                      >
                        {m.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
