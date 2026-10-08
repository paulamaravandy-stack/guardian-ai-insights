import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Banknote, Smartphone, Landmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatSLE, formatDateTime, sourceLabels } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contributions")({
  head: () => ({
    meta: [
      { title: "Contributions — OSUSUGUARD AI" },
      { name: "description", content: "Record and verify cash, mobile money, and bank transfer contributions." },
    ],
  }),
  component: ContributionsPage,
});

const sourceIcons: Record<string, typeof Banknote> = {
  cash: Banknote,
  mobile_money: Smartphone,
  bank_transfer: Landmark,
};

function ContributionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await supabase.from("groups").select("id, name")).data ?? [],
  });
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await supabase.from("members").select("id, full_name")).data ?? [],
  });
  const { data: contributions } = useQuery({
    queryKey: ["contributions"],
    queryFn: async () =>
      (await supabase.from("contributions").select("*, members(full_name), groups(name)").order("contributed_at", { ascending: false })).data ?? [],
  });

  async function recordContribution(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("contributions").insert({
      group_id: groupId,
      member_id: memberId,
      amount: Number(amount),
      source,
      reference: reference || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not record contribution", { description: error.message });
      return;
    }
    await supabase.from("audit_logs").insert({
      actor_name: "You", action: "recorded_contribution", entity_type: "contribution", entity_ref: reference || "no-ref",
      details: `${formatSLE(Number(amount))} via ${sourceLabels[source]}`,
    });
    toast.success("Contribution recorded", { description: "The AI engine will reconcile it against all evidence sources." });
    setShowForm(false);
    setAmount(""); setReference("");
    queryClient.invalidateQueries({ queryKey: ["contributions"] });
  }

  const inputCls = "rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <AppShell>
      <PageHeader
        title="Contribution Management"
        subtitle="Record contributions across cash, mobile money, and bank transfer"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Record Contribution
          </button>
        }
      />

      {showForm && (
        <form onSubmit={recordContribution} className="glass mb-6 grid gap-4 rounded-2xl p-6 sm:grid-cols-3 animate-fade-up">
          <select required value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputCls}>
            <option value="">Select group…</option>
            {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputCls}>
            <option value="">Select member…</option>
            {members?.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <input required type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (SLE)" className={inputCls} />
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
            <option value="cash">Cash</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction reference" className={inputCls} />
          <button disabled={saving} className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60">
            {saving ? "Recording…" : "Record contribution"}
          </button>
        </form>
      )}

      <div className="glass overflow-hidden rounded-2xl animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Group</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {contributions?.map((c) => {
                const Icon = sourceIcons[c.source] ?? Banknote;
                return (
                  <tr key={c.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30">
                    <td className="px-6 py-4 font-medium">{c.members?.full_name ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{c.groups?.name ?? "—"}</td>
                    <td className="px-6 py-4 font-display font-semibold text-primary">{formatSLE(Number(c.amount))}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" /> {sourceLabels[c.source] ?? c.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.reference ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDateTime(c.contributed_at)}</td>
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
