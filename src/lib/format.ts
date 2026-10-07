export function formatSLE(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `SLE ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const riskStyles: Record<RiskLevel, string> = {
  low: "bg-primary/15 text-primary border-primary/30",
  medium: "bg-gold/15 text-gold border-gold/30",
  high: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  critical: "bg-destructive/15 text-destructive border-destructive/40",
};

export const sourceLabels: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
};
