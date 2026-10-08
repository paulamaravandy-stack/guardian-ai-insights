import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BrainCircuit, GitCompareArrows, Copy, CalendarClock, Wallet,
  FileWarning, Ghost, UserCog, ScanSearch, Database, Smartphone, Landmark, ClipboardList, ScrollText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader, StatCard } from "@/components/app-shell";
import { riskStyles, type RiskLevel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fraud-center")({
  head: () => ({
    meta: [
      { title: "AI Fraud Center — OSUSUGUARD AI" },
      { name: "description", content: "Explainable AI fraud detection, anomaly detection, and multi-source verification." },
    ],
  }),
  component: FraudCenter,
});

const detectors = [
  { icon: Copy, name: "Duplicate Contribution Detection", desc: "Flags reused transaction references and double-recorded payments." },
  { icon: FileWarning, name: "Missing Contribution Detection", desc: "Identifies members who skipped a cycle while peers contributed." },
  { icon: CalendarClock, name: "Late Payment Detection", desc: "Tracks contributions arriving after cycle deadlines." },
  { icon: Wallet, name: "Unauthorized Payout Detection", desc: "Verifies payouts against rotation order and cycle position." },
  { icon: ScanSearch, name: "Contribution Manipulation", desc: "Detects amounts deviating from expected cycle values without evidence." },
  { icon: Ghost, name: "Ghost Member Detection", desc: "Finds registered members with no verifiable identity or activity." },
  { icon: UserCog, name: "Collector Fraud Detection", desc: "Spots collectors with repeated unverified cash entries." },
];

const sources = [
  { icon: Database, label: "Source A", name: "Contribution Records" },
  { icon: Smartphone, label: "Source B", name: "Mobile Money Evidence" },
  { icon: Landmark, label: "Source C", name: "Bank Transactions" },
  { icon: ClipboardList, label: "Source D", name: "Collector Records" },
  { icon: ScrollText, label: "Source E", name: "Audit Logs" },
];

function FraudCenter() {
  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () =>
      (await supabase.from("fraud_alerts").select("*, members(full_name), groups(name)").order("risk_score", { ascending: false })).data ?? [],
  });

  const open = alerts?.filter((a) => a.status === "open") ?? [];
  const avgConfidence = alerts?.length
    ? Math.round((alerts.reduce((s, a) => s + Number(a.confidence), 0) / alerts.length) * 100)
    : 0;

  return (
    <AppShell>
      <PageHeader title="AI Fraud Center" subtitle="Explainable multi-source fraud detection engine" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Detections" value={String(open.length)} icon={BrainCircuit} tone="destructive" trend="Open alerts requiring review" />
        <StatCard label="Avg. AI Confidence" value={`${avgConfidence}%`} icon={ScanSearch} trend="Across all flagged events" />
        <StatCard label="Sources Reconciled" value="5" icon={GitCompareArrows} tone="gold" trend="Cross-verified per transaction" />
      </div>

      <div className="glass mt-6 rounded-2xl p-6 animate-fade-up">
        <h3 className="mb-1 font-display text-lg font-semibold">Multi-Source Verification Engine</h3>
        <p className="mb-5 text-xs text-muted-foreground">
          Every contribution is reconciled across five independent evidence sources. Inconsistencies feed the fraud model.
        </p>
        <div className="grid gap-3 sm:grid-cols-5">
          {sources.map(({ icon: Icon, label, name }) => (
            <div key={label} className="rounded-xl bg-secondary/40 p-4 text-center">
              <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gold">{label}</p>
              <p className="mt-1 text-xs font-medium">{name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {detectors.map(({ icon: Icon, name, desc }) => (
          <div key={name} className="glass glass-hover rounded-2xl p-5 animate-fade-up">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h4 className="text-sm font-semibold">{name}</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="glass mt-6 rounded-2xl p-6 animate-fade-up">
        <h3 className="mb-4 font-display text-lg font-semibold">Explainable AI — Latest Flagged Events</h3>
        <div className="space-y-4">
          {alerts?.slice(0, 4).map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-secondary/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-sm font-semibold">
                  {a.alert_code} · {a.members?.full_name ?? "—"} · {a.groups?.name ?? "—"}
                </p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                    Confidence {Math.round(Number(a.confidence) * 100)}%
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${riskStyles[a.risk_level as RiskLevel] ?? riskStyles.low}`}>
                    {a.risk_level} · {a.risk_score}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.explanation}</p>
              {Array.isArray(a.contributing_factors) && a.contributing_factors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(a.contributing_factors as string[]).map((f) => (
                    <span key={f} className="rounded-full bg-gold/10 px-3 py-1 text-[11px] text-gold">{f}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
