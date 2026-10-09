import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Settings, Users, ShieldCheck, Database, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader, StatCard } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — OSUSUGUARD AI" },
      { name: "description", content: "Manage users, roles, permissions, and system settings." },
    ],
  }),
  component: AdminPage,
});

const roleDescriptions = [
  { role: "Administrator", desc: "Full platform access: users, groups, settings, and fraud resolution." },
  { role: "Collector", desc: "Records contributions and uploads supporting evidence." },
  { role: "Group Leader", desc: "Manages group membership, cycles, and payout order." },
  { role: "Member", desc: "Views personal contributions, risk profile, and group status." },
  { role: "Auditor", desc: "Reviews fraud alerts, audit trails, and generates compliance reports." },
];

function AdminPage() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("system_settings").select("*")).data ?? [],
  });
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await supabase.from("members").select("id")).data ?? [],
  });
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await supabase.from("groups").select("id")).data ?? [],
  });

  return (
    <AppShell>
      <PageHeader title="Administration" subtitle="Users, roles, permissions, and system configuration" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered Members" value={String(members?.length ?? "—")} icon={Users} />
        <StatCard label="Active Groups" value={String(groups?.length ?? "—")} icon={Database} tone="chart-3" />
        <StatCard label="AI Engine" value="v2.4" icon={Cpu} tone="gold" trend="OsusuGuard XAI — operational" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" /> Roles & Permissions
          </h3>
          <div className="space-y-3">
            {roleDescriptions.map((r) => (
              <div key={r.role} className="rounded-xl bg-secondary/40 px-4 py-3">
                <p className="text-sm font-semibold">{r.role}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Settings className="h-5 w-5 text-gold" /> System Settings
          </h3>
          <div className="space-y-3">
            {settings?.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.key.replace(/_/g, " ")}
                </p>
                <p className="font-display text-sm font-semibold text-primary">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Risk thresholds control when the AI engine escalates alerts from medium to high and critical.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
