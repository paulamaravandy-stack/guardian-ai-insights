import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatSLE, riskLevelFromScore } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — OSUSUGUARD AI" },
      { name: "description", content: "Executive analytics: top risk groups, members, fraud frequency, and trends." },
    ],
  }),
  component: AnalyticsPage,
});

const predictionData = [
  { month: "May", actual: 820000, predicted: 800000 },
  { month: "Jun", actual: 940000, predicted: 910000 },
  { month: "Jul", actual: 1010000, predicted: 990000 },
  { month: "Aug", actual: 980000, predicted: 1050000 },
  { month: "Sep", actual: 1150000, predicted: 1120000 },
  { month: "Oct", actual: 1090000, predicted: 1180000 },
  { month: "Nov", actual: null, predicted: 1240000 },
  { month: "Dec", actual: null, predicted: 1310000 },
];

const tooltipStyle = {
  background: "oklch(0.21 0.04 262)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: 12,
};

function AnalyticsPage() {
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => (await supabase.from("members").select("*")).data ?? [],
  });
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await supabase.from("fraud_alerts").select("*, groups(name)")).data ?? [],
  });
  const { data: contributions } = useQuery({
    queryKey: ["contributions"],
    queryFn: async () => (await supabase.from("contributions").select("group_id, amount, groups(name)")).data ?? [],
  });

  const topRiskMembers = [...(members ?? [])].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

  const groupMap = new Map<string, { name: string; total: number; alerts: number }>();
  contributions?.forEach((c) => {
    const name = (c.groups as { name?: string } | null)?.name ?? "Unknown";
    const entry = groupMap.get(c.group_id) ?? { name, total: 0, alerts: 0 };
    entry.total += Number(c.amount);
    groupMap.set(c.group_id, entry);
  });
  alerts?.forEach((a) => {
    if (a.group_id && groupMap.has(a.group_id)) groupMap.get(a.group_id)!.alerts += 1;
  });
  const groupPerf = [...groupMap.values()].sort((a, b) => b.total - a.total);

  const fraudByType = Object.entries(
    (alerts ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.alert_type] = (acc[a.alert_type] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name: name.replace(/_/g, " "), count }));

  return (
    <AppShell>
      <PageHeader title="Executive Analytics" subtitle="Risk intelligence, fraud frequency, and contribution forecasting" />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-1 font-display text-lg font-semibold">Contribution Trend & AI Prediction</h3>
          <p className="mb-4 text-xs text-muted-foreground">Actual vs predicted monthly volume (SLE)</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                <XAxis dataKey="month" stroke="oklch(0.68 0.03 255)" fontSize={12} />
                <YAxis stroke="oklch(0.68 0.03 255)" fontSize={12} tickFormatter={(v: number) => `${v / 1000}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" stroke="oklch(0.72 0.17 162)" strokeWidth={2.5} dot={false} name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke="oklch(0.82 0.15 85)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="AI prediction" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-1 font-display text-lg font-semibold">Fraud Frequency by Type</h3>
          <p className="mb-4 text-xs text-muted-foreground">Detected incidents per fraud category</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fraudByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 6%)" />
                <XAxis type="number" stroke="oklch(0.68 0.03 255)" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} stroke="oklch(0.68 0.03 255)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="oklch(0.82 0.15 85)" radius={[0, 6, 6, 0]} name="Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-4 font-display text-lg font-semibold">Top Risk Members</h3>
          <div className="space-y-3">
            {topRiskMembers.map((m, i) => {
              const level = riskLevelFromScore(m.risk_score);
              return (
                <div key={m.id} className="flex items-center gap-4 rounded-xl bg-secondary/40 px-4 py-3">
                  <span className="font-display text-sm font-bold text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{m.full_name}</p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${level === "critical" || level === "high" ? "bg-destructive" : level === "medium" ? "bg-gold" : "bg-primary"}`}
                        style={{ width: `${m.risk_score}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-display text-sm font-bold">{m.risk_score}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-4 font-display text-lg font-semibold">Group Performance</h3>
          <div className="space-y-3">
            {groupPerf.map((g) => (
              <div key={g.name} className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.alerts} fraud alert{g.alerts === 1 ? "" : "s"}</p>
                </div>
                <p className="font-display text-sm font-semibold text-primary">{formatSLE(g.total)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
