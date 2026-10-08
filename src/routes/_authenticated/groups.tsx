import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Users, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatSLE } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { title: "Group Management — OSUSUGUARD AI" },
      { name: "description", content: "Create and manage Osusu savings groups, members, and statistics." },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => (await supabase.from("groups").select("*").order("created_at")).data ?? [],
  });
  const { data: groupMembers } = useQuery({
    queryKey: ["group_members"],
    queryFn: async () => (await supabase.from("group_members").select("*")).data ?? [],
  });
  const { data: contributions } = useQuery({
    queryKey: ["contributions"],
    queryFn: async () => (await supabase.from("contributions").select("group_id, amount")).data ?? [],
  });

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("groups").insert({
      name,
      location,
      contribution_amount: Number(amount) || 0,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not create group", { description: error.message });
      return;
    }
    await supabase.from("audit_logs").insert({
      actor_name: "You",
      action: "created_group",
      entity_type: "group",
      entity_ref: name,
      details: `Group created with cycle amount ${formatSLE(Number(amount) || 0)}`,
    });
    toast.success("Group created");
    setShowForm(false);
    setName(""); setLocation(""); setAmount("");
    queryClient.invalidateQueries({ queryKey: ["groups"] });
  }

  async function deleteGroup(id: string, groupName: string) {
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete group", { description: error.message });
      return;
    }
    toast.success(`Deleted ${groupName}`);
    queryClient.invalidateQueries({ queryKey: ["groups"] });
  }

  return (
    <AppShell>
      <PageHeader
        title="Group Management"
        subtitle="Create, monitor, and manage Osusu savings groups"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New Group
          </button>
        }
      />

      {showForm && (
        <form onSubmit={createGroup} className="glass mb-6 grid gap-4 rounded-2xl p-6 sm:grid-cols-4 animate-fade-up">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name"
            className="rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location"
            className="rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <input required type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Cycle amount (SLE)"
            className="rounded-xl border border-input bg-secondary/40 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button disabled={saving} className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60">
            {saving ? "Saving…" : "Create group"}
          </button>
        </form>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {groups?.map((g) => {
          const memberCount = groupMembers?.filter((gm) => gm.group_id === g.id).length ?? 0;
          const total = contributions?.filter((c) => c.group_id === g.id).reduce((s, c) => s + Number(c.amount), 0) ?? 0;
          return (
            <div key={g.id} className="glass glass-hover rounded-2xl p-6 animate-fade-up">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {g.location ?? "—"}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  g.status === "active" ? "border-primary/30 bg-primary/15 text-primary" : "border-destructive/40 bg-destructive/15 text-destructive"
                }`}>
                  {g.status}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-secondary/40 py-3">
                  <p className="flex items-center justify-center gap-1 font-display text-lg font-bold"><Users className="h-3.5 w-3.5 text-muted-foreground" />{memberCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Members</p>
                </div>
                <div className="rounded-xl bg-secondary/40 py-3">
                  <p className="font-display text-lg font-bold">{g.cycle_length_weeks}w</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cycle</p>
                </div>
                <div className="rounded-xl bg-secondary/40 py-3">
                  <p className="font-display text-lg font-bold text-primary">{formatSLE(total)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Collected</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Leader: {g.leader_name ?? "—"}</p>
                <button onClick={() => deleteGroup(g.id, g.name)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
