import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, BrainCircuit, GitCompareArrows, BellRing, ArrowRight, HandCoins, UsersRound, ScrollText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OSUSUGUARD AI — Explainable Fraud Detection for Osusu Savings Groups" },
      {
        name: "description",
        content:
          "An explainable multi-source AI framework for fraud detection in informal community savings groups (Osusu). Detect, explain, and prevent contribution fraud.",
      },
      { property: "og:title", content: "OSUSUGUARD AI" },
      {
        property: "og:description",
        content: "AI-powered financial intelligence for Osusu savings groups: fraud detection, risk scoring, and explainable alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: GitCompareArrows,
    title: "Multi-Source Verification",
    text: "Reconciles contribution records against mobile money, bank statements, collector logs, and audit trails.",
  },
  {
    icon: BrainCircuit,
    title: "Explainable AI",
    text: "Every flag comes with a human-readable explanation, contributing factors, and a confidence score.",
  },
  {
    icon: BellRing,
    title: "Real-Time Alert Center",
    text: "Duplicate, missing, late, and manipulated contributions surface instantly with risk scoring.",
  },
  {
    icon: HandCoins,
    title: "Contribution Management",
    text: "Record cash, mobile money, and bank transfer contributions with full transaction references.",
  },
  {
    icon: UsersRound,
    title: "Group & Member Intelligence",
    text: "Risk profiles, payout positions, and contribution history for every Osusu group and member.",
  },
  {
    icon: ScrollText,
    title: "Immutable Audit Trail",
    text: "Every action — from contribution edits to fraud reviews — is logged for full accountability.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-lg font-bold">
            OSUSU<span className="text-primary">GUARD</span>
          </span>
        </div>
        <Link
          to="/auth"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary animate-fade-up">
          <BrainCircuit className="h-3.5 w-3.5" />
          Explainable Multi-Source AI Framework
        </div>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl animate-fade-up">
          Protect every <span className="text-gradient-emerald">Osusu</span> contribution with AI you can trust
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg animate-fade-up">
          OSUSUGUARD AI detects fraud, missing contributions, payout irregularities, and fake records in
          informal community savings groups — and explains exactly why every alert was raised.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-up">
          <Link
            to="/auth"
            className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Explore features
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass glass-hover rounded-2xl p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        OSUSUGUARD AI — An Explainable Multi-Source AI Framework for Fraud Detection in Informal Community Savings Groups
      </footer>
    </div>
  );
}
