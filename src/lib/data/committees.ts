import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { parseProgramCommittees, type ProgramCommittee } from "@/lib/ui-constants";

// Séances de comité avec membres extérieurs (voir migration 0051).
// Les mêmes chargeurs servent l'équipe (client connecté) et le portail des membres
// (client administrateur, APRÈS contrôle du jeton : voir src/app/c/[token]).

export type SessionStatus = "Préparation" | "Ouverte" | "Close";

export type SessionRow = {
  id: string;
  committeeType: string;
  title: string;
  sessionDate: string | null;
  opinionDeadline: string;
  status: SessionStatus;
  createdAt: string;
  items: number;
  members: number;
  opinions: number;
};

export type CDocument = { id: string; name: string; size: number | null; storagePath: string; createdAt: string };
export type COpinion = { memberId: string; conflict: boolean; opinion: string | null; conditions: string | null; comment: string | null; updatedAt: string };
export type CComment = { id: string; authorName: string; fromIdawa: boolean; memberId: string | null; body: string; createdAt: string };
export type CItem = {
  id: string;
  entityType: "deal" | "company";
  entityId: string;
  name: string;
  href: string;
  summary: string | null;
  sector: string | null;
  hasFolder: boolean;
  stage: string | null;
  /** Société en participation (equity) ou accompagnée : détermine la nature des décisions. */
  equity: boolean;
  passageId: string | null;
  passageDecision: string | null;
  passageStatus: string | null;
  documents: CDocument[];
  opinions: COpinion[];
  comments: CComment[];
};
export type CMember = {
  id: string;
  name: string;
  email: string | null;
  organization: string | null;
  contactId: string | null;
  token: string;
  invitedAt: string | null;
  acceptedAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
};
export type SessionDetail = {
  id: string;
  committeeType: string;
  title: string;
  sessionDate: string | null;
  opinionDeadline: string;
  status: SessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  items: CItem[];
  members: CMember[];
};

export async function getCommitteeSessions(): Promise<SessionRow[]> {
  const supabase = await createClient();
  const [s, i, m, o] = await Promise.all([
    supabase.from("committee_sessions").select("id, committee_type, title, session_date, opinion_deadline, status, created_at").order("created_at", { ascending: false }),
    supabase.from("committee_session_items").select("session_id"),
    supabase.from("committee_session_members").select("session_id").is("revoked_at", null),
    supabase.from("committee_opinions").select("item_id, opinion, committee_session_items!inner(session_id)").not("opinion", "is", null),
  ]);
  const count = (rows: { session_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.session_id, (m.get(r.session_id) ?? 0) + 1);
    return m;
  };
  const items = count(i.data), members = count(m.data);
  const opinions = count(((o.data ?? []) as unknown as { committee_session_items: { session_id: string } }[]).map((x) => ({ session_id: x.committee_session_items.session_id })));
  return (s.data ?? []).map((r) => ({
    id: r.id, committeeType: r.committee_type, title: r.title, sessionDate: r.session_date,
    opinionDeadline: r.opinion_deadline, status: r.status as SessionStatus, createdAt: r.created_at,
    items: items.get(r.id) ?? 0, members: members.get(r.id) ?? 0, opinions: opinions.get(r.id) ?? 0,
  }));
}

/** Détail d'une séance. `client` : client connecté (équipe) ou administrateur (portail, jeton vérifié). */
export async function loadSession(client: SupabaseClient, sessionId: string): Promise<SessionDetail | null> {
  const { data: s } = await client.from("committee_sessions")
    .select("id, committee_type, title, session_date, opinion_deadline, status, opened_at, closed_at").eq("id", sessionId).maybeSingle();
  if (!s) return null;

  const [itemRes, memberRes] = await Promise.all([
    client.from("committee_session_items").select("id, deal_id, company_id, position, passage_id, created_at").eq("session_id", sessionId).order("position").order("created_at"),
    client.from("committee_session_members").select("id, name, email, organization, contact_id, token, invited_at, confidentiality_accepted_at, last_seen_at, revoked_at").eq("session_id", sessionId).order("created_at"),
  ]);
  const itemRows = (itemRes.data ?? []) as { id: string; deal_id: string | null; company_id: string | null; passage_id: string | null }[];
  const itemIds = itemRows.map((r) => r.id);
  const dealIds = itemRows.map((r) => r.deal_id).filter(Boolean) as string[];
  const companyIds = itemRows.map((r) => r.company_id).filter(Boolean) as string[];
  const passageIds = itemRows.map((r) => r.passage_id).filter(Boolean) as string[];
  const none = ["00000000-0000-0000-0000-000000000000"];

  const [deals, companies, docs, ops, coms, passages, subs] = await Promise.all([
    client.from("deals").select("id, company_name, description, stage, primary_sub_sector_id, sharepoint_folder_id").in("id", dealIds.length ? dealIds : none),
    client.from("portfolio_companies").select("id, name, description, status, tracking_type, primary_sub_sector_id, sharepoint_folder_id").in("id", companyIds.length ? companyIds : none),
    client.from("committee_documents").select("id, item_id, name, size, storage_path, created_at").in("item_id", itemIds.length ? itemIds : none).order("created_at"),
    client.from("committee_opinions").select("item_id, member_id, conflict, opinion, conditions, comment, updated_at").in("item_id", itemIds.length ? itemIds : none),
    client.from("committee_comments").select("id, item_id, member_id, author_id, author_name, body, created_at").in("item_id", itemIds.length ? itemIds : none).order("created_at"),
    client.from("committee_passages").select("id, decision, status").in("id", passageIds.length ? passageIds : none),
    client.from("sub_sectors").select("id, name"),
  ]);
  const subName = new Map((subs.data ?? []).map((x) => [x.id as string, x.name as string]));
  const dealMap = new Map((deals.data ?? []).map((d) => [d.id as string, d]));
  const coMap = new Map((companies.data ?? []).map((c) => [c.id as string, c]));
  const passMap = new Map((passages.data ?? []).map((p) => [p.id as string, p]));
  const by = <T extends { item_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) { if (!m.has(r.item_id)) m.set(r.item_id, []); m.get(r.item_id)!.push(r); }
    return m;
  };
  const docsBy = by(docs.data as { item_id: string; id: string; name: string; size: number | null; storage_path: string; created_at: string }[]);
  const opsBy = by(ops.data as { item_id: string; member_id: string; conflict: boolean; opinion: string | null; conditions: string | null; comment: string | null; updated_at: string }[]);
  const comsBy = by(coms.data as { item_id: string; id: string; member_id: string | null; author_id: string | null; author_name: string; body: string; created_at: string }[]);

  const items: CItem[] = itemRows.map((r) => {
    const d = r.deal_id ? dealMap.get(r.deal_id) : null;
    const c = r.company_id ? coMap.get(r.company_id) : null;
    const p = r.passage_id ? passMap.get(r.passage_id) : null;
    return {
      id: r.id,
      entityType: d ? "deal" : "company",
      entityId: (r.deal_id ?? r.company_id) as string,
      name: (d?.company_name ?? c?.name ?? "—") as string,
      href: d ? `/pipeline/${r.deal_id}` : `/portefeuille/${r.company_id}`,
      summary: (d?.description ?? c?.description ?? null) as string | null,
      sector: subName.get((d?.primary_sub_sector_id ?? c?.primary_sub_sector_id) as string) ?? null,
      hasFolder: !!(d?.sharepoint_folder_id ?? c?.sharepoint_folder_id),
      stage: (d?.stage ?? c?.status ?? null) as string | null,
      equity: c ? c.tracking_type === "equity" : false,
      passageId: r.passage_id,
      passageDecision: (p?.decision ?? null) as string | null,
      passageStatus: (p?.status ?? null) as string | null,
      documents: (docsBy.get(r.id) ?? []).map((x) => ({ id: x.id, name: x.name, size: x.size, storagePath: x.storage_path, createdAt: x.created_at })),
      opinions: (opsBy.get(r.id) ?? []).map((x) => ({ memberId: x.member_id, conflict: x.conflict, opinion: x.opinion, conditions: x.conditions, comment: x.comment, updatedAt: x.updated_at })),
      comments: (comsBy.get(r.id) ?? []).map((x) => ({ id: x.id, authorName: x.author_name, fromIdawa: !x.member_id, memberId: x.member_id, body: x.body, createdAt: x.created_at })),
    };
  });

  const members: CMember[] = ((memberRes.data ?? []) as Record<string, string | null>[]).map((m) => ({
    id: m.id as string, name: m.name as string, email: m.email, organization: m.organization, contactId: m.contact_id,
    token: m.token as string, invitedAt: m.invited_at, acceptedAt: m.confidentiality_accepted_at, lastSeenAt: m.last_seen_at, revokedAt: m.revoked_at,
  }));

  return {
    id: s.id, committeeType: s.committee_type, title: s.title, sessionDate: s.session_date, opinionDeadline: s.opinion_deadline,
    status: s.status as SessionStatus, openedAt: s.opened_at, closedAt: s.closed_at, items, members,
  };
}

export async function getCommitteeSession(id: string) {
  return loadSession(await createClient(), id);
}

/** Choix proposés à la préparation : dossiers actifs, sociétés, contacts. */
export async function getSessionOptions() {
  const supabase = await createClient();
  const [deals, companies, contacts, programs] = await Promise.all([
    supabase.from("deals").select("id, company_name, deal_state").neq("deal_state", "Écarté").order("company_name"),
    supabase.from("portfolio_companies").select("id, name").order("name"),
    supabase.from("contacts").select("id, name, email, organization, function").not("email", "is", null).order("name"),
    supabase.from("programs").select("committees"),
  ]);
  const programCommittees: ProgramCommittee[] = [];
  for (const c of (programs.data ?? []).flatMap((p) => parseProgramCommittees(p.committees)))
    if (!programCommittees.some((x) => x.name === c.name)) programCommittees.push(c);
  return {
    entities: [
      ...(deals.data ?? []).map((d) => ({ type: "deal" as const, id: d.id as string, name: d.company_name as string })),
      ...(companies.data ?? []).map((c) => ({ type: "company" as const, id: c.id as string, name: c.name as string })),
    ],
    contacts: (contacts.data ?? []).map((c) => ({ id: c.id as string, name: c.name as string, email: c.email as string, organization: c.organization as string | null, isMember: c.function === "Membre de comité" })),
    programCommittees,
  };
}
export type SessionOptions = Awaited<ReturnType<typeof getSessionOptions>>;
