import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, User, HandCoins, ShieldAlert, UsersRound, FileBarChart } from "lucide-react";
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

function AuditPage() {
  const { data: logs } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <AppShell>
      <PageHeader title="Audit Trail" subtitle="Immutable record of every action across the platform" />

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
          {!logs?.length && <p className="py-8 text-center text-sm text-muted-foreground">No audit events yet.</p>}
        </div>
      </div>
    </AppShell>
  );
}
