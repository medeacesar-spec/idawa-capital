// ÉCRITURE ENCADRÉE dans SharePoint — SERVEUR UNIQUEMENT.
//
// Seul point d'écriture de l'ERP dans Microsoft 365. Règles (feuille de route, phase 3) :
//   - identité distincte de la lecture (« Idawa ERP – ecriture », certificat propre) ;
//   - droit d'écriture sur le SEUL site « Idawa Depots » (Sites.Selected, rôle write) ;
//   - AJOUT SEULEMENT : chaque dépôt est un nouveau fichier ; le chemin et le nom sont fixés ici,
//     jamais par l'utilisateur ; un fichier existant n'est jamais écrasé (conflictBehavior=fail) ;
//     ce module ne contient aucune suppression ;
//   - contrôle du contenu (vrai classeur .xlsx sans macros, PDF, taille plafonnée) ;
//   - empreintes : SHA-256 calculée ici + quickXorHash de SharePoint, gardées dans le journal
//     `sharepoint_writes` pour détecter toute modification ultérieure du fichier.
//
// Variables (Vercel) : MS_TENANT_ID, MS_WRITE_CLIENT_ID, MS_WRITE_CERT_KEY,
// MS_WRITE_CERT_THUMBPRINT, MS_DEPOTS_SITE_ID.

import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SharePointError, fetchAppToken } from "./graph";

const GRAPH = "https://graph.microsoft.com/v1.0";
export const MAX_BYTES = 10 * 1024 * 1024;
const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024 - 1;

export function writeConfigured(): boolean {
  return !!(process.env.MS_TENANT_ID && process.env.MS_WRITE_CLIENT_ID && process.env.MS_WRITE_CERT_KEY
    && process.env.MS_WRITE_CERT_THUMBPRINT && process.env.MS_DEPOTS_SITE_ID);
}

let cached: { token: string; until: number } | null = null;
let driveCache: string | null = null;

async function token(): Promise<string> {
  if (cached && Date.now() < cached.until) return cached.token;
  if (!writeConfigured()) throw new SharePointError("Écriture SharePoint non configurée", 503);
  const t = await fetchAppToken({
    clientId: process.env.MS_WRITE_CLIENT_ID!, certKey: process.env.MS_WRITE_CERT_KEY, certThumbprint: process.env.MS_WRITE_CERT_THUMBPRINT, label: "écriture",
  });
  cached = { token: t.token, until: Date.now() + (t.expiresIn - 300) * 1000 };
  return t.token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : GRAPH + path, {
    ...init, headers: { Authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) }, cache: "no-store",
  });
  if (res.status === 409) throw new SharePointError("Un fichier du même nom existe déjà : rien n'a été écrasé", 409);
  if (res.status === 401 || res.status === 403) throw new SharePointError("L'application n'a pas le droit d'écrire à cet endroit", 403);
  if (res.status === 404) throw new SharePointError("Élément introuvable dans le site Dépôts", 404);
  if (!res.ok) throw new SharePointError(`SharePoint indisponible (${res.status})`, 502);
  return (await res.json()) as T;
}

async function depotsDrive(): Promise<string> {
  if (driveCache) return driveCache;
  const d = await call<{ id: string }>(`/sites/${encodeURIComponent(process.env.MS_DEPOTS_SITE_ID!)}/drive?$select=id`);
  driveCache = d.id;
  return d.id;
}

// ── Contrôle des fichiers ────────────────────────────────────────────────────────

export type FileKind = "xlsx" | "pdf";

/** Vérifie le contenu réel (pas seulement l'extension). Renvoie la raison du refus, ou null. */
export function checkFile(bytes: Uint8Array, name: string, kind: FileKind): string | null {
  if (bytes.length === 0) return "Le fichier est vide.";
  if (bytes.length > MAX_BYTES) return `Le fichier dépasse ${MAX_BYTES / 1024 / 1024} Mo.`;
  const lower = name.toLowerCase();
  if (kind === "pdf") {
    if (!lower.endsWith(".pdf")) return "Seuls les fichiers PDF sont acceptés ici.";
    if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-") return "Ce fichier n'est pas un vrai PDF.";
    return null;
  }
  if (lower.endsWith(".xlsm") || lower.endsWith(".xls") || lower.endsWith(".xlsb")) return "Seuls les classeurs .xlsx sont acceptés (pas de fichier à macros ni d'ancien format).";
  if (!lower.endsWith(".xlsx")) return "Seuls les classeurs Excel .xlsx sont acceptés.";
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04)) return "Ce fichier n'est pas un vrai classeur Excel.";
  // Les noms des parties d'un .xlsx sont stockés en clair dans l'archive.
  const text = Buffer.from(bytes).toString("latin1");
  if (!text.includes("[Content_Types].xml") || !text.includes("xl/workbook.xml")) return "Ce fichier n'est pas un vrai classeur Excel.";
  if (text.includes("xl/vbaProject.bin") || /macroEnabled/i.test(text)) return "Ce classeur contient des macros : elles ne sont pas acceptées.";
  return null;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Segment de chemin sûr : lettres, chiffres, espaces et quelques signes ; jamais « .. » ni « / ». */
export function safeSegment(s: string, max = 60): string {
  const clean = s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ._()-]/g, " ").replace(/\.{2,}/g, ".").replace(/\s+/g, " ").trim().replace(/^[.\s]+|[.\s]+$/g, "");
  return (clean || "sans-nom").slice(0, max);
}

// ── Écriture ─────────────────────────────────────────────────────────────────────

export type WriteKind = "mensuel" | "annuel" | "releve" | "controle";
export type WriteResult = { id: string; itemId: string; webUrl: string; path: string; sha256: string; quickXor: string | null };

type DriveItem = { id: string; webUrl: string; file?: { hashes?: { quickXorHash?: string } } };

/**
 * Ajoute un fichier dans « Idawa Depots » et l'inscrit au journal.
 * Chemin : Entreprises/<Nom (id court)>/<année>/<période>/<V{n} - AAAA-MM-JJ HHhMM - nom d'origine>.
 */
export async function addFile(o: {
  companyId: string | null; companyName: string; kind: WriteKind; period: string | null; version: number | null;
  originalName: string; bytes: Uint8Array; fileKind: FileKind; origin: "depot" | "equipe" | "controle"; depositId?: string | null;
}): Promise<WriteResult> {
  const refused = checkFile(o.bytes, o.originalName, o.fileKind);
  if (refused) throw new SharePointError(refused, 400);
  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10)} ${String(now.getUTCHours()).padStart(2, "0")}h${String(now.getUTCMinutes()).padStart(2, "0")}`;
  const ext = o.fileKind === "pdf" ? ".pdf" : ".xlsx";
  const base = safeSegment(o.originalName.replace(/\.[^.]+$/, ""), 80);
  const folder = o.kind === "controle"
    ? ["_Controle de connexion"]
    : ["Entreprises", `${safeSegment(o.companyName)} (${(o.companyId ?? "").slice(0, 8)})`, (o.period ?? "").slice(0, 4) || "sans-annee", safeSegment(o.period ?? "sans-periode", 20)];
  const fileName = `${o.version != null ? `V${o.version} - ` : ""}${stamp} - ${base}${ext}`;
  const path = [...folder, fileName].join("/");
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const drive = await depotsDrive();
  const digest = sha256(o.bytes);

  let item: DriveItem;
  if (o.bytes.length <= SIMPLE_UPLOAD_MAX) {
    item = await call<DriveItem>(`/drives/${drive}/root:/${encoded}:/content?@microsoft.graph.conflictBehavior=fail`, {
      method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: Buffer.from(o.bytes),
    });
  } else {
    const session = await call<{ uploadUrl: string }>(`/drives/${drive}/root:/${encoded}:/createUploadSession`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "fail" } }),
    });
    const CHUNK = 3_276_800; // multiple de 320 Kio
    let last: DriveItem | null = null;
    for (let start = 0; start < o.bytes.length; start += CHUNK) {
      const end = Math.min(start + CHUNK, o.bytes.length);
      const res = await fetch(session.uploadUrl, {
        method: "PUT", body: Buffer.from(o.bytes.subarray(start, end)),
        headers: { "Content-Length": String(end - start), "Content-Range": `bytes ${start}-${end - 1}/${o.bytes.length}` },
      });
      if (res.status === 409) throw new SharePointError("Un fichier du même nom existe déjà : rien n'a été écrasé", 409);
      if (!res.ok) throw new SharePointError(`Envoi interrompu (${res.status})`, 502);
      if (res.status === 200 || res.status === 201) last = (await res.json()) as DriveItem;
    }
    if (!last) throw new SharePointError("Envoi incomplet", 502);
    item = last;
  }

  const quickXor = item.file?.hashes?.quickXorHash ?? null;
  const { data, error } = await createAdminClient().from("sharepoint_writes").insert({
    company_id: o.companyId, kind: o.kind, period: o.period, version: o.version, path, item_id: item.id, web_url: item.webUrl,
    size: o.bytes.length, sha256: digest, quick_xor: quickXor, origin: o.origin, deposit_id: o.depositId ?? null,
  }).select("id").single();
  if (error || !data) throw new SharePointError("Fichier envoyé, mais le journal n'a pas pu être écrit", 500);
  return { id: data.id, itemId: item.id, webUrl: item.webUrl, path, sha256: digest, quickXor };
}

/**
 * Vérifie que les fichiers inscrits au journal n'ont pas changé dans SharePoint depuis leur dépôt
 * (comparaison du quickXorHash, sans télécharger les fichiers). Renvoie les anomalies.
 */
export async function checkIntegrity(limit = 200): Promise<{ checked: number; problems: { path: string; integrity: string }[] }> {
  const admin = createAdminClient();
  const { data } = await admin.from("sharepoint_writes").select("id, path, item_id, quick_xor")
    .order("last_checked_at", { ascending: true, nullsFirst: true }).limit(limit);
  const drive = await depotsDrive();
  const problems: { path: string; integrity: string }[] = [];
  let checked = 0;
  for (const w of data ?? []) {
    let integrity = "ok";
    try {
      const it = await call<DriveItem>(`/drives/${drive}/items/${encodeURIComponent(w.item_id as string)}?$select=id,file`);
      const now = it.file?.hashes?.quickXorHash ?? null;
      if (w.quick_xor && now !== w.quick_xor) integrity = "modifie";
    } catch (e) {
      integrity = e instanceof SharePointError && e.status === 404 ? "introuvable" : "erreur";
    }
    await admin.from("sharepoint_writes").update({ last_checked_at: new Date().toISOString(), integrity }).eq("id", w.id);
    if (integrity !== "ok") problems.push({ path: w.path as string, integrity });
    checked++;
  }
  return { checked, problems };
}
