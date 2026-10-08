import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatDate, riskStyles, type RiskLevel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alert Center — OSUSUGUARD AI" },
      { name: "description", content: "Monitor and review fraud alerts with explainable AI reasoning." },
    ],
  }),
  component: AlertsPage,
});

const filters = ["all", "low", "medium", "high", "critical"] as const;

function AlertsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () =>
      (await supabase.from("fraud_alerts").select("*, members(full_name), groups(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const visible = alerts?.filter((a) => filter === "all" || a.risk_level === filter) ?? [];

  async function setStatus(id: string, status: string, code: string) {
    const { error } = await supabase.from("fraud_alerts").update({ status }).eq("id", id);
    if (error) {
      toast.error("Could not update alert", { description: error.message });
      return;
    }
    await supabase.from("audit_logs").insert({
      actor_name: "You", action: "reviewed_alert", entity_type: "fraud_alert", entity_ref: code,
      details: `Alert marked as ${status}`,
    });
    toast.success(`Alert ${status.replace("_", " ")}`);
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
  }

  return (
    <AppShell>
      <PageHeader title="AI Alert Center" subtitle="Fraud monitoring with full explainability" />

      <div className="mb-6 flex flex-wrap gap-2 animate-fade-up">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="glass overflow-hidden rounded-2xl animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Alert ID</th>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Group</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Risk</th>
                <th className="px-6 py-4">Explanation</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id} className="border-b border-border/50 align-top transition-colors hover:bg-secondary/30">
                  <td className="px-6 py-4 font-mono text-xs text-gold">{a.alert_code}</td>
                  <td className="px-6 py-4 font-medium">{a.members?.full_name ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{a.groups?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(a.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${riskStyles[a.risk_level as RiskLevel] ?? riskStyles.low}`}>
                      {a.risk_level} · {a.risk_score}
                    </span>
                  </td>
                  <td className="max-w-xs px-6 py-4 text-xs leading-relaxed text-muted-foreground">{a.explanation}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium capitalize ${a.status === "open" ? "text-destructive" : a.status === "resolved" ? "text-primary" : "text-gold"}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {a.status !== "resolved" && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setStatus(a.id, "under_review", a.alert_code)}
                          className="rounded-lg border border-gold/30 px-3 py-1 text-[11px] font-medium text-gold hover:bg-gold/10">
                          Review
                        </button>
                        <button onClick={() => setStatus(a.id, "resolved", a.alert_code)}
                          className="rounded-lg border border-primary/30 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/10">
                          Resolve
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-muted-foreground">No alerts match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
