"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyPermissions, isExternalRole } from "@/lib/auth/permissions";
import { committeeInviteEmail, sendEmail } from "@/lib/email/resend";
import { SharePointError, downloadFile, fullPath, getItem } from "@/lib/sharepoint/graph";

// Préparation et conduite des séances de comité (équipe Idawa).
// Droit requis : Comités en Édition ou Validation, rôle interne.

type Result<T = object> = ({ ok: true } & T) | { ok?: false; error: string };

async function editor() {
  const { perms, roleName } = await getMyPermissions();
  if (!(perms.comites === "E" || perms.comites === "V") || isExternalRole(roleName)) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}
const DENIED = { error: "Droit « Comités » en édition requis." };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.includes("localhost") || host.startsWith("127.") ? "http" : "https";
  return `${proto}://${host}`;
}

async function sessionOf(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  const { data } = await supabase.from("committee_sessions").select("id, status, committee_type, title, session_date, opinion_deadline").eq("id", sessionId).maybeSingle();
  return data;
}
async function itemSession(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string) {
  const { data } = await supabase.from("committee_session_items")
    .select("id, session_id, deal_id, company_id, passage_id, committee_sessions(status)").eq("id", itemId).maybeSingle();
  return data as { id: string; session_id: string; deal_id: string | null; company_id: string | null; passage_id: string | null; committee_sessions: { status: string } } | null;
}
const refresh = (sessionId?: string) => { revalidatePath("/comites"); if (sessionId) revalidatePath(`/comites/${sessionId}`); };

// ── Séance ────────────────────────────────────────────────────────────────────

export async function createSession(input: { committeeType: string; title: string; sessionDate: string | null; opinionDeadline: string }): Promise<Result<{ id: string }>> {
  const ctx = await editor(); if (!ctx) return DENIED;
  if (!input.title.trim() || !input.committeeType) return { error: "Type de comité et intitulé requis." };
  if (!input.opinionDeadline) return { error: "La date limite des avis est obligatoire." };
  const { data, error } = await ctx.supabase.from("committee_sessions").insert({
    committee_type: input.committeeType, title: input.title.trim(), session_date: input.sessionDate || null, opinion_deadline: input.opinionDeadline,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Création impossible." };
  refresh();
  return { ok: true, id: data.id };
}

export async function updateSession(id: string, input: { committeeType: string; title: string; sessionDate: string | null; opinionDeadline: string }): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const s = await sessionOf(ctx.supabase, id);
  if (!s) return { error: "Séance introuvable." };
  if (s.status === "Close") return { error: "Séance close." };
  if (!input.title.trim() || !input.opinionDeadline) return { error: "Intitulé et date limite des avis requis." };
  const { error } = await ctx.supabase.from("committee_sessions").update({
    committee_type: input.committeeType, title: input.title.trim(), session_date: input.sessionDate || null, opinion_deadline: input.opinionDeadline,
  }).eq("id", id);
  if (error) return { error: error.message };
  refresh(id);
  return { ok: true };
}

export async function deleteSession(id: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const s = await sessionOf(ctx.supabase, id);
  if (!s) return { error: "Séance introuvable." };
  if (s.status !== "Préparation") return { error: "Seule une séance en préparation peut être supprimée." };
  const { data: docs } = await ctx.supabase.from("committee_documents").select("storage_path, committee_session_items!inner(session_id)").eq("committee_session_items.session_id", id);
  const paths = (docs ?? []).map((d) => d.storage_path as string);
  if (paths.length) await ctx.supabase.storage.from("documents").remove(paths);
  const { error } = await ctx.supabase.from("committee_sessions").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

// ── Ordre du jour ─────────────────────────────────────────────────────────────

export async function addItem(sessionId: string, entityType: "deal" | "company", entityId: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const s = await sessionOf(ctx.supabase, sessionId);
  if (!s || s.status === "Close") return { error: "Séance close ou introuvable." };
  const { count } = await ctx.supabase.from("committee_session_items").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
  const { error } = await ctx.supabase.from("committee_session_items").insert({
    session_id: sessionId, position: count ?? 0, deal_id: entityType === "deal" ? entityId : null, company_id: entityType === "company" ? entityId : null,
  });
  if (error) return { error: error.code === "23505" ? "Ce dossier est déjà à l'ordre du jour." : error.message };
  refresh(sessionId);
  return { ok: true };
}

export async function removeItem(itemId: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const it = await itemSession(ctx.supabase, itemId);
  if (!it) return { error: "Dossier introuvable." };
  if (it.committee_sessions.status !== "Préparation") return { error: "Une fois la séance ouverte, l'ordre du jour ne se réduit plus (les avis déjà donnés seraient perdus)." };
  const { data: docs } = await ctx.supabase.from("committee_documents").select("storage_path").eq("item_id", itemId);
  if (docs?.length) await ctx.supabase.storage.from("documents").remove(docs.map((d) => d.storage_path as string));
  await ctx.supabase.from("committee_session_items").delete().eq("id", itemId);
  refresh(it.session_id);
  return { ok: true };
}

// ── Dossier de séance (copies figées) ─────────────────────────────────────────

const safeName = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

/** Copie dans l'application les fichiers SharePoint choisis : le dossier de séance ne bouge plus ensuite. */
export async function addSharePointDocuments(itemId: string, spItemIds: string[]): Promise<Result<{ added: number }>> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const it = await itemSession(ctx.supabase, itemId);
  if (!it || it.committee_sessions.status === "Close") return { error: "Séance close ou introuvable." };
  const table = it.deal_id ? "deals" : "portfolio_companies";
  const { data: ent } = await ctx.supabase.from(table).select("sharepoint_folder_id").eq("id", (it.deal_id ?? it.company_id) as string).single();
  if (!ent?.sharepoint_folder_id) return { error: "Aucun dossier SharePoint rattaché à cette fiche." };
  try {
    const rootPath = fullPath(await getItem(ent.sharepoint_folder_id));
    let added = 0;
    for (const spId of spItemIds.slice(0, 30)) {
      const { item, data } = await downloadFile(spId);
      // Garde-fou : uniquement des fichiers situés sous le dossier de l'entreprise.
      if (!fullPath(item).startsWith(rootPath + "/")) throw new SharePointError(`« ${item.name} » n'est pas dans le dossier de l'entreprise`, 403);
      const path = `comites/${it.session_id}/${itemId}/${Date.now()}-${safeName(item.name)}`;
      const up = await ctx.supabase.storage.from("documents").upload(path, data, { contentType: "application/octet-stream" });
      if (up.error) return { error: `Copie de « ${item.name} » impossible : ${up.error.message}` };
      await ctx.supabase.from("committee_documents").insert({
        item_id: itemId, name: item.name, storage_path: path, size: item.size ?? data.byteLength, sp_item_id: spId, sp_modified_at: item.lastModifiedDateTime ?? null,
      });
      added++;
    }
    refresh(it.session_id);
    return { ok: true, added };
  } catch (e) {
    return { error: e instanceof SharePointError ? e.message : "Lecture SharePoint impossible." };
  }
}

/** Enregistre un fichier téléversé depuis l'ordinateur (déjà déposé dans le stockage par le navigateur). */
export async function registerUploadedDocument(itemId: string, name: string, storagePath: string, size: number): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const it = await itemSession(ctx.supabase, itemId);
  if (!it || it.committee_sessions.status === "Close") return { error: "Séance close ou introuvable." };
  if (!storagePath.startsWith(`comites/${it.session_id}/${itemId}/`)) return { error: "Emplacement de fichier invalide." };
  const { error } = await ctx.supabase.from("committee_documents").insert({ item_id: itemId, name, storage_path: storagePath, size });
  if (error) return { error: error.message };
  refresh(it.session_id);
  return { ok: true };
}

export async function removeDocument(docId: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const { data: d } = await ctx.supabase.from("committee_documents").select("id, item_id, storage_path").eq("id", docId).maybeSingle();
  if (!d) return { error: "Document introuvable." };
  const it = await itemSession(ctx.supabase, d.item_id);
  if (!it || it.committee_sessions.status === "Close") return { error: "Séance close." };
  // Le fichier reste si un passage en comité le cite déjà (pièce de la décision).
  const { count } = await ctx.supabase.from("documents").select("id", { count: "exact", head: true }).eq("storage_path", d.storage_path);
  if (!count) await ctx.supabase.storage.from("documents").remove([d.storage_path]);
  await ctx.supabase.from("committee_documents").delete().eq("id", docId);
  refresh(it.session_id);
  return { ok: true };
}

// ── Membres ───────────────────────────────────────────────────────────────────

export async function addMember(sessionId: string, input: { contactId?: string; name?: string; email?: string; organization?: string }): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const s = await sessionOf(ctx.supabase, sessionId);
  if (!s || s.status === "Close") return { error: "Séance close ou introuvable." };
  let contact: { id: string; name: string; email: string | null; organization: string | null } | null = null;
  if (input.contactId) {
    const { data } = await ctx.supabase.from("contacts").select("id, name, email, organization").eq("id", input.contactId).single();
    contact = data;
  } else {
    const name = input.name?.trim(), email = input.email?.trim().toLowerCase();
    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Nom et e-mail valides requis." };
    // Le membre entre aussi au répertoire des contacts, pour les séances suivantes.
    const { data: existing } = await ctx.supabase.from("contacts").select("id, name, email, organization").ilike("email", email).limit(1);
    contact = existing?.[0] ?? null;
    if (!contact) {
      const { data, error } = await ctx.supabase.from("contacts").insert({
        name, email, organization: input.organization?.trim() || null, function: "Membre de comité", org_type: "Comité",
      }).select("id, name, email, organization").single();
      if (error) return { error: error.message };
      contact = data;
    }
  }
  if (!contact) return { error: "Contact introuvable." };
  if (!contact.email) return { error: "Ce contact n'a pas d'e-mail : ajoutez-le d'abord à sa fiche contact." };
  const { error } = await ctx.supabase.from("committee_session_members").insert({
    session_id: sessionId, contact_id: contact.id, name: contact.name, email: contact.email, organization: contact.organization,
  });
  if (error) return { error: error.code === "23505" ? "Ce membre est déjà invité." : error.message };
  refresh(sessionId);
  return { ok: true };
}

/** Retire un membre. S'il a déjà reçu son lien, l'accès est coupé mais sa participation est conservée. */
export async function removeMember(memberId: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const { data: m } = await ctx.supabase.from("committee_session_members").select("id, session_id, invited_at").eq("id", memberId).maybeSingle();
  if (!m) return { error: "Membre introuvable." };
  if (m.invited_at) await ctx.supabase.from("committee_session_members").update({ revoked_at: new Date().toISOString() }).eq("id", memberId);
  else await ctx.supabase.from("committee_session_members").delete().eq("id", memberId);
  refresh(m.session_id);
  return { ok: true };
}

async function invite(supabase: Awaited<ReturnType<typeof createClient>>, memberId: string, origin: string) {
  const { data: m } = await supabase.from("committee_session_members")
    .select("id, name, email, token, session_id, revoked_at").eq("id", memberId).single();
  if (!m || m.revoked_at) return { ok: false, link: null };
  const { data: s } = await supabase.from("committee_sessions").select("committee_type, title, session_date, opinion_deadline").eq("id", m.session_id).single();
  const { data: items } = await supabase.from("committee_session_items").select("deal_id, company_id, deals(company_name), portfolio_companies(name)").eq("session_id", m.session_id).order("position");
  const names = ((items ?? []) as unknown as { deals: { company_name: string } | null; portfolio_companies: { name: string } | null }[])
    .map((i) => i.deals?.company_name ?? i.portfolio_companies?.name ?? "").filter(Boolean);
  const link = `${origin}/c/${m.token}`;
  const mail = committeeInviteEmail({ memberName: m.name, committeeType: s!.committee_type, title: s!.title, sessionDate: s!.session_date, deadline: s!.opinion_deadline, items: names, link });
  const sent = m.email ? await sendEmail({ to: m.email, subject: mail.subject, html: mail.html }) : { ok: false };
  await supabase.from("committee_session_members").update({ invited_at: new Date().toISOString() }).eq("id", memberId);
  return { ok: sent.ok, link };
}

/** Ouvre la séance : les membres reçoivent leur lien personnel par e-mail. */
export async function openSession(id: string): Promise<Result<{ sent: number; total: number }>> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const s = await sessionOf(ctx.supabase, id);
  if (!s) return { error: "Séance introuvable." };
  if (s.status !== "Préparation") return { error: "La séance est déjà ouverte." };
  const [{ count: items }, { data: members }] = await Promise.all([
    ctx.supabase.from("committee_session_items").select("id", { count: "exact", head: true }).eq("session_id", id),
    ctx.supabase.from("committee_session_members").select("id").eq("session_id", id).is("revoked_at", null),
  ]);
  if (!items) return { error: "Ajoutez au moins un dossier à l'ordre du jour." };
  if (!members?.length) return { error: "Ajoutez au moins un membre." };
  await ctx.supabase.from("committee_sessions").update({ status: "Ouverte", opened_at: new Date().toISOString() }).eq("id", id);
  const origin = await siteOrigin();
  let sent = 0;
  for (const m of members) if ((await invite(ctx.supabase, m.id, origin)).ok) sent++;
  refresh(id);
  return { ok: true, sent, total: members.length };
}

/** (Ré)envoie son lien à un membre ; renvoie aussi le lien pour le copier. */
export async function inviteMember(memberId: string): Promise<Result<{ emailed: boolean; link: string }>> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const { data: m } = await ctx.supabase.from("committee_session_members").select("session_id, committee_sessions(status)").eq("id", memberId).single();
  const status = (m?.committee_sessions as unknown as { status: string } | null)?.status;
  if (status !== "Ouverte") return { error: "Le lien s'envoie une fois la séance ouverte." };
  const r = await invite(ctx.supabase, memberId, await siteOrigin());
  if (!r.link) return { error: "Membre retiré." };
  refresh(m!.session_id);
  return { ok: true, emailed: r.ok, link: r.link };
}

// ── Échanges ──────────────────────────────────────────────────────────────────

export async function postStaffComment(itemId: string, body: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  if (!body.trim()) return { error: "Message vide." };
  const it = await itemSession(ctx.supabase, itemId);
  if (!it || it.committee_sessions.status === "Close") return { error: "Séance close." };
  const { data: p } = await ctx.supabase.from("profiles").select("full_name, email").eq("id", ctx.user.id).single();
  const { error } = await ctx.supabase.from("committee_comments").insert({
    item_id: itemId, author_id: ctx.user.id, author_name: `${p?.full_name || p?.email || "Équipe"} (Idawa Capital)`, body: body.trim(),
  });
  if (error) return { error: error.message };
  refresh(it.session_id);
  return { ok: true };
}

// ── Décision et clôture ───────────────────────────────────────────────────────

/**
 * Rattache à un dossier de la séance la décision qu'Idawa vient d'enregistrer (passage en
 * comité « Proposée », chaîne de validation habituelle). Les pièces présentées sont jointes
 * au passage : la fiche garde la version sur laquelle le comité s'est prononcé.
 */
export async function linkDecision(itemId: string, passageId: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const it = await itemSession(ctx.supabase, itemId);
  if (!it) return { error: "Dossier introuvable." };
  await ctx.supabase.from("committee_session_items").update({ passage_id: passageId }).eq("id", itemId);
  const { data: docs } = await ctx.supabase.from("committee_documents").select("name, storage_path").eq("item_id", itemId);
  if (docs?.length) {
    await ctx.supabase.from("documents").insert(docs.map((d) => ({
      title: (d.name as string).replace(/\.[^.]+$/, ""), category: "Comité", storage_path: d.storage_path,
      deal_id: it.deal_id, company_id: it.company_id, committee_id: passageId,
    })));
  }
  refresh(it.session_id);
  return { ok: true };
}

export async function closeSession(id: string): Promise<Result> {
  const ctx = await editor(); if (!ctx) return DENIED;
  const s = await sessionOf(ctx.supabase, id);
  if (!s || s.status !== "Ouverte") return { error: "Seule une séance ouverte peut être close." };
  const { data: items } = await ctx.supabase.from("committee_session_items").select("passage_id").eq("session_id", id);
  if ((items ?? []).some((i) => !i.passage_id)) return { error: "Enregistrez d'abord la décision de chaque dossier." };
  await ctx.supabase.from("committee_sessions").update({ status: "Close", closed_at: new Date().toISOString() }).eq("id", id);
  refresh(id);
  return { ok: true };
}
