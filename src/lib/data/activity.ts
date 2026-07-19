// Activité de l'équipe : qui vient, à quelle fréquence, et qui est connecté maintenant.
//
// Le journal d'audit dit ce qui a été modifié. Il ne disait pas qui s'était connecté —
// or c'est souvent la première question : untel a-t-il ouvert l'outil ce mois-ci, la
// personne à qui j'ai assigné une action l'a-t-elle seulement vue ?

import { createClient } from "@/lib/supabase/server";

export type UserActivity = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  logins: number;
  lastLogin: string | null;
  actions: number;
  lastAction: string | null;
  online: boolean;
};

export type ActiveSession = {
  email: string;
  name: string | null;
  started: string;
  lastSeen: string;
};

export type ActivityData = {
  users: UserActivity[];
  sessions: ActiveSession[];
  /** Fenêtre d'observation, en jours. */
  windowDays: number;
};

/** Au-delà, on considère que la personne a quitté l'outil sans se déconnecter. */
const ONLINE_MINUTES = 20;

export async function getActivity(windowDays = 30): Promise<ActivityData> {
  const supabase = await createClient();
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

  const [profRes, loginRes, auditRes, sessRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, roles(name)"),
    supabase.from("login_events").select("user_id, at").gte("at", since),
    supabase.from("audit_log").select("actor_id, at").gte("at", since),
    supabase.rpc("active_sessions"),
  ]);

  const logins = loginRes.data ?? [];
  const audits = auditRes.data ?? [];
  const rawSessions = (sessRes.data ?? []) as { user_id: string; email: string; started: string; last_seen: string }[];

  const cutoff = Date.now() - ONLINE_MINUTES * 60_000;
  const onlineIds = new Set(
    rawSessions.filter((s) => Date.parse(s.last_seen) >= cutoff).map((s) => s.user_id)
  );

  const users: UserActivity[] = (profRes.data ?? []).map((p) => {
    const mine = logins.filter((l) => l.user_id === p.id);
    const acts = audits.filter((a) => a.actor_id === p.id);
    const latest = (rows: { at: string | null }[]) =>
      rows.length ? rows.map((r) => r.at ?? "").sort().slice(-1)[0] || null : null;
    return {
      id: p.id as string,
      name: (p.full_name as string) || (p.email as string) || "—",
      email: (p.email as string) ?? null,
      role: ((p.roles as { name?: string } | null)?.name) ?? null,
      logins: mine.length,
      lastLogin: latest(mine),
      actions: acts.length,
      lastAction: latest(acts),
      online: onlineIds.has(p.id as string),
    };
  });

  // Les plus actifs d'abord : c'est la lecture utile, pas l'ordre alphabétique.
  users.sort((a, b) => b.logins - a.logins || b.actions - a.actions || a.name.localeCompare(b.name));

  const nameByEmail = new Map(users.map((u) => [u.email ?? "", u.name]));
  const sessions: ActiveSession[] = rawSessions
    .filter((s) => Date.parse(s.last_seen) >= cutoff)
    .map((s) => ({
      email: s.email,
      name: nameByEmail.get(s.email) ?? null,
      started: s.started,
      lastSeen: s.last_seen,
    }));

  return { users, sessions, windowDays };
}
