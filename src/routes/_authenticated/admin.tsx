import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Users, ShieldCheck, Database, Cpu, Lock, UserCog } from "lucide-react";
import { toast } from "sonner";
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

type AppRole = "admin" | "collector" | "group_leader" | "member" | "auditor";
const ALL_ROLES: { role: AppRole; label: string; desc: string }[] = [
  { role: "admin", label: "Administrator", desc: "Full platform access: users, groups, settings, and fraud resolution." },
  { role: "collector", label: "Collector", desc: "Records contributions and uploads supporting evidence." },
  { role: "group_leader", label: "Group Leader", desc: "Manages group membership, cycles, and payout order." },
  { role: "member", label: "Member", desc: "Views personal contributions, risk profile, and group status." },
  { role: "auditor", label: "Auditor", desc: "Reviews fraud alerts, audit trails, and generates compliance reports." },
];

function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return !!data;
    },
  });
}

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return <AppShell><PageHeader title="Administration" subtitle="Checking permissions…" /></AppShell>;
  if (!isAdmin)
    return (
      <AppShell>
        <PageHeader title="Administration" subtitle="Restricted area" />
        <div className="glass rounded-2xl p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-3 font-semibold">Administrators only</p>
          <p className="mt-1 text-sm text-muted-foreground">Your account does not have permission to view this page.</p>
        </div>
      </AppShell>
    );
  return <AdminContent />;
}

function AdminContent() {
  const qc = useQueryClient();
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
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = async (userId: string, role: AppRole, grant: boolean) => {
    const { error } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: role, _grant: grant });
    if (error) return toast.error(error.message);
    toast.success(grant ? "Role granted" : "Role removed");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <AppShell>
      <PageHeader title="Administration" subtitle="Users, roles, permissions, and system configuration" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered Members" value={String(members?.length ?? "—")} icon={Users} />
        <StatCard label="Active Groups" value={String(groups?.length ?? "—")} icon={Database} tone="chart-3" />
        <StatCard label="AI Engine" value="v2.4" icon={Cpu} tone="gold" trend="OsusuGuard XAI — operational" />
      </div>

      <div className="glass mt-6 rounded-2xl p-6 animate-fade-up">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
          <UserCog className="h-5 w-5 text-primary" /> User & Role Management
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">User</th>
                {ALL_ROLES.map((r) => <th key={r.role} className="px-2 py-2 text-center">{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-t border-border/50">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  {ALL_ROLES.map((r) => {
                    const has = (u.roles ?? []).includes(r.role);
                    return (
                      <td key={r.role} className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${r.label} for ${u.email}`}
                          checked={has}
                          onChange={() => toggle(u.id, r.role, !has)}
                          className="h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" /> Roles & Permissions
          </h3>
          <div className="space-y-3">
            {ALL_ROLES.map((r) => (
              <div key={r.role} className="rounded-xl bg-secondary/40 px-4 py-3">
                <p className="text-sm font-semibold">{r.label}</p>
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
