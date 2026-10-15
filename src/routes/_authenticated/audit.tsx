import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollText, User, HandCoins, ShieldAlert, UsersRound, FileBarChart, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — OSUSUGUARD AI" },
      { name: "description", content: "Complete audit trail of user actions, contributions, and fraud reviews." },
    ],
  }),
  component: AuditPage,
});

const entityIcons: Record<string, typeof ScrollText> = {
  group: UsersRound,
  member: User,
  contribution: HandCoins,
  fraud_alert: ShieldAlert,
  report: FileBarChart,
};

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function AuditPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: logs } = useQuery({
    queryKey: ["audit_logs", from, to],
    queryFn: async () => {
      let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false });
      if (from) q = q.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
      if (to) q = q.lte("created_at", new Date(`${to}T23:59:59.999`).toISOString());
      return (await q).data ?? [];
    },
  });

  function exportCsv() {
    if (!logs?.length) {
      toast.error("No audit events in this date range");
      return;
    }
    const header = ["Timestamp", "Actor", "Action", "Entity type", "Entity", "Details"];
    const rows = logs.map((l) =>
      [l.created_at, l.actor_name, l.action, l.entity_type, l.entity_ref, l.details].map(csvCell).join(","),
    );
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log_${from || "start"}_to_${to || new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    toast.success(`Exported ${logs.length} audit events`);
  }

  const inputCls = "rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground";

  return (
    <AppShell>
      <PageHeader title="Audit Trail" subtitle="Immutable record of every action across the platform" />

      <div className="glass mb-6 flex flex-wrap items-end gap-4 rounded-2xl p-5 animate-fade-up">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </label>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }} className="rounded-xl px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{logs?.length ?? 0} events</span>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 animate-fade-up">
        <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[22px] before:top-4 before:w-px before:bg-border">
          {logs?.map((log) => {
            const Icon = entityIcons[log.entity_type] ?? ScrollText;
            return (
              <div key={log.id} className="relative flex gap-5 py-4">
                <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 rounded-xl bg-secondary/30 px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      <span className="text-primary">{log.actor_name}</span>{" "}
                      <span className="text-muted-foreground">{log.action.replace(/_/g, " ")}</span>{" "}
                      {log.entity_ref && <span className="font-semibold">{log.entity_ref}</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                  </div>
                  {log.details && <p className="mt-1 text-xs text-muted-foreground">{log.details}</p>}
                </div>
              </div>
            );
          })}
          {!logs?.length && <p className="py-8 text-center text-sm text-muted-foreground">No audit events in this range.</p>}
        </div>
      </div>
    </AppShell>
  );
}
