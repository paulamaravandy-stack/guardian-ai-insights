import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UsersRound, Users, HandCoins, BellRing } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader, StatCard } from "@/components/app-shell";
import { formatSLE, formatDateTime, riskStyles, type RiskLevel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — OSUSUGUARD AI" },
      { name: "description", content: "Overview of groups, members, contributions, and fraud alerts." },
    ],
  }),
  component: Dashboard,
});

const trendData = [
  { week: "W1", contributions: 180000, alerts: 1 },
  { week: "W2", contributions: 240000, alerts: 0 },
  { week: "W3", contributions: 210000, alerts: 2 },
  { week: "W4", contributions: 320000, alerts: 1 },
  { week: "W5", contributions: 285000, alerts: 3 },
  { week: "W6", contributions: 360000, alerts: 2 },
  { week: "W7", contributions: 410000, alerts: 1 },
  { week: "W8", contributions: 395000, alerts: 2 },
];

const riskData = [
  { name: "Low", value: 7, color: "oklch(0.72 0.17 162)" },
  { name: "Medium", value: 3, color: "oklch(0.82 0.15 85)" },
  { name: "High", value: 1, color: "oklch(0.62 0.22 25)" },
  { name: "Critical", value: 1, color: "oklch(0.55 0.24 25)" },
];

function Dashboard() {
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await supabase.from("groups").select("*")).data ?? [],
  });
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await supabase.from("members").select("*")).data ?? [],
  });
  const { data: contributions } = useQuery({
    queryKey: ["contributions"],
    queryFn: async () =>
      (await supabase.from("contributions").select("*, members(full_name), groups(name)").order("contributed_at", { ascending: false })).data ?? [],
  });
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () =>
      (await supabase.from("fraud_alerts").select("*, members(full_name), groups(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const totalContributions = contributions?.reduce((s, c) => s + Number(c.amount), 0) ?? 0;
  const openAlerts = alerts?.filter((a) => a.status === "open").length ?? 0;

  return (
    <AppShell>
      <PageHeader title="Dashboard" subtitle="Real-time intelligence across all Osusu groups" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Groups" value={String(groups?.length ?? "—")} icon={UsersRound} trend="4 active · 1 suspended" />
        <StatCard label="Total Members" value={String(members?.length ?? "—")} icon={Users} tone="chart-3" trend="Across all groups" />
        <StatCard label="Total Contributions" value={formatSLE(totalContributions)} icon={HandCoins} tone="gold" trend="This cycle" />
        <StatCard label="Open Fraud Alerts" value={String(openAlerts)} icon={BellRing} tone="destructive" trend={`${alerts?.length ?? 0} total alerts`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="glass rounded-2xl p-6 xl:col-span-2 animate-fade-up">
          <h3 className="mb-1 font-display text-lg font-semibold">Contributions & Fraud Trend</h3>
          <p className="mb-4 text-xs text-muted-foreground">Weekly contribution volume vs detected alerts</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="contrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                <XAxis dataKey="week" stroke="oklch(0.68 0.03 255)" fontSize={12} />
                <YAxis stroke="oklch(0.68 0.03 255)" fontSize={12} tickFormatter={(v: number) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.04 262)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }}
                  labelStyle={{ color: "oklch(0.95 0.01 250)" }}
                />
                <Area type="monotone" dataKey="contributions" stroke="oklch(0.72 0.17 162)" fill="url(#contrib)" strokeWidth={2} name="Contributions (SLE)" />
                <Area type="monotone" dataKey="alerts" stroke="oklch(0.82 0.15 85)" fill="transparent" strokeWidth={2} name="Fraud alerts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-1 font-display text-lg font-semibold">Risk Distribution</h3>
          <p className="mb-4 text-xs text-muted-foreground">Members by risk level</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {riskData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.04 262)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-4 font-display text-lg font-semibold">Recent Transactions</h3>
          <div className="space-y-3">
            {contributions?.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{c.members?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{c.groups?.name} · {formatDateTime(c.contributed_at)}</p>
                </div>
                <p className="font-display text-sm font-semibold text-primary">{formatSLE(Number(c.amount))}</p>
              </div>
            ))}
            {!contributions?.length && <p className="text-sm text-muted-foreground">No contributions yet.</p>}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-4 font-display text-lg font-semibold">Recent Alerts</h3>
          <div className="space-y-3">
            {alerts?.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-xl bg-secondary/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{a.alert_code} · {a.members?.full_name ?? "—"}</p>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${riskStyles[a.risk_level as RiskLevel] ?? riskStyles.low}`}>
                    {a.risk_level}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.explanation}</p>
              </div>
            ))}
            {!alerts?.length && <p className="text-sm text-muted-foreground">No alerts yet.</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
