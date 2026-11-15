// Lecture EN DIRECT des dossiers SharePoint (Microsoft Graph, accès application).
// SERVEUR UNIQUEMENT : utilise le certificat (ou, à défaut, le secret) de l'application enregistrée dans Entra.
//
// Rien n'est copié dans la base : la fiche ne garde que l'identifiant du dossier de
// l'entreprise (stable, même si le dossier est renommé ou déplacé) ; le contenu est lu
// à l'ouverture de l'onglet Documents. Pas de doublon, pas de synchronisation, pas de lien cassé.
//
// Variables d'environnement (Vercel) : MS_TENANT_ID, MS_CLIENT_ID, puis
//   - de préférence un CERTIFICAT : MS_CLIENT_CERT_KEY (clé privée PEM) + MS_CLIENT_CERT_THUMBPRINT
//     (empreinte SHA-1 du certificat, affichée par Entra) — rien de réutilisable ne circule ;
//   - sinon MS_CLIENT_SECRET (ancien mode, à supprimer une fois le certificat en place) ;
// MS_SP_DRIVE_ID (facultatif : bibliothèque « Documents » du site d'équipe par défaut).
//
// Droits Microsoft : Sites.Selected, lecture accordée au seul site « Idawa Capital » (15/11/2026).

import { createSign, randomUUID } from "crypto";

const GRAPH = "https://graph.microsoft.com/v1.0";
const DEFAULT_DRIVE = "b!bVsanLKfeEuBmgyiVpj7XiZ-OXKXahhFohOtk3TSc1cTg80aLtQAT7FLV2jnAiVV";

export type SpItem = {
  id: string;
  name: string;
  isFolder: boolean;
  childCount: number | null;
  size: number | null;
  webUrl: string;
  modifiedAt: string | null;
};

export class SharePointError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

function certConfigured(): boolean {
  return !!(process.env.MS_CLIENT_CERT_KEY && process.env.MS_CLIENT_CERT_THUMBPRINT);
}

export function sharePointConfigured(): boolean {
  return !!(process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && (certConfigured() || process.env.MS_CLIENT_SECRET));
}

const b64url = (b: Buffer) => b.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

/** Assertion signée par la clé privée du certificat (flux « client credentials » sans secret). */
function clientAssertion(tokenUrl: string): string {
  const thumb = process.env.MS_CLIENT_CERT_THUMBPRINT!.replace(/[^0-9a-fA-F]/g, "");
  // La clé collée dans Vercel peut arriver avec des « \n » littéraux au lieu de vrais retours à la ligne.
  const key = process.env.MS_CLIENT_CERT_KEY!.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", x5t: b64url(Buffer.from(thumb, "hex")) })));
  const payload = b64url(Buffer.from(JSON.stringify({
    aud: tokenUrl, iss: process.env.MS_CLIENT_ID, sub: process.env.MS_CLIENT_ID,
    jti: randomUUID(), nbf: now - 60, exp: now + 600,
  })));
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(key);
  return `${header}.${payload}.${b64url(signature)}`;
}

export function driveId(): string {
  return process.env.MS_SP_DRIVE_ID || DEFAULT_DRIVE;
}

// Jeton d'application, gardé en mémoire jusqu'à 5 min avant son expiration.
let cached: { token: string; until: number } | null = null;

async function token(): Promise<string> {
  if (cached && Date.now() < cached.until) return cached.token;
  if (!sharePointConfigured()) throw new SharePointError("Connexion SharePoint non configurée", 503);
  const tokenUrl = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`;
  const auth: Record<string, string> = certConfigured()
    ? { client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer", client_assertion: clientAssertion(tokenUrl) }
    : { client_secret: process.env.MS_CLIENT_SECRET! };
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.MS_CLIENT_ID!, scope: "https://graph.microsoft.com/.default", ...auth }),
    cache: "no-store",
  });
  if (!res.ok) throw new SharePointError(certConfigured()
    ? "Microsoft a refusé la connexion de l'application (certificat expiré, ou absent d'Entra ?)"
    : "Microsoft a refusé la connexion de l'application (identifiants ou secret expiré ?)", 502);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: Date.now() + (j.expires_in - 300) * 1000 };
  return j.access_token;
}

async function graph<T>(path: string): Promise<T> {
  const res = await fetch(path.startsWith("http") ? path : GRAPH + path, {
    headers: { Authorization: `Bearer ${await token()}` },
    cache: "no-store",
  });
  if (res.status === 404) throw new SharePointError("Dossier introuvable sur SharePoint (supprimé, ou accès retiré)", 404);
  if (res.status === 401 || res.status === 403) throw new SharePointError("L'application n'a pas le droit de lire ce dossier SharePoint", 403);
  if (!res.ok) throw new SharePointError(`SharePoint indisponible (${res.status})`, 502);
  return (await res.json()) as T;
}

type GraphItem = {
  id: string; name: string; size?: number; webUrl: string; lastModifiedDateTime?: string;
  folder?: { childCount: number }; file?: object;
  parentReference?: { path?: string; driveId?: string };
};

const SELECT = "id,name,size,webUrl,lastModifiedDateTime,folder,file,parentReference";

const toItem = (g: GraphItem): SpItem => ({
  id: g.id, name: g.name, isFolder: !!g.folder, childCount: g.folder?.childCount ?? null,
  size: g.file ? g.size ?? null : null, webUrl: g.webUrl, modifiedAt: g.lastModifiedDateTime ?? null,
});

// Fichiers techniques qui n'ont rien à faire dans la liste.
const HIDDEN = (name: string) => name === ".DS_Store" || name.startsWith("~$") || name === "desktop.ini";

export async function getItem(itemId: string): Promise<GraphItem> {
  return graph<GraphItem>(`/drives/${driveId()}/items/${encodeURIComponent(itemId)}?$select=${SELECT}`);
}

/** Élément désigné par son chemin dans la bibliothèque (ex. « General »). */
export async function getItemByPath(path: string): Promise<GraphItem> {
  const rel = path.split("/").map(encodeURIComponent).join("/");
  return graph<GraphItem>(`/drives/${driveId()}/root:/${rel}?$select=${SELECT}`);
}

/** Contenu d'un dossier, rangé comme SharePoint : sous-dossiers d'abord, puis fichiers, ordre naturel. */
export async function listChildren(itemId: string): Promise<SpItem[]> {
  const out: GraphItem[] = [];
  let next: string | null = `/drives/${driveId()}/items/${encodeURIComponent(itemId)}/children?$select=${SELECT}&$top=200`;
  while (next) {
    const page: { value: GraphItem[]; "@odata.nextLink"?: string } = await graph(next);
    out.push(...page.value);
    next = page["@odata.nextLink"] ?? null;
  }
  return out
    .filter((g) => !HIDDEN(g.name))
    .map(toItem)
    .sort((a, b) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name, "fr", { numeric: true, sensitivity: "base" }) : a.isFolder ? -1 : 1));
}

/** Chemin complet d'un élément dans la bibliothèque (pour vérifier qu'il est bien sous le dossier de l'entreprise). */
export function fullPath(g: GraphItem): string {
  const parent = decodeURIComponent((g.parentReference?.path ?? "").replace(/^.*?root:/, ""));
  return `${parent}/${g.name}`;
}

/**
 * Retrouve un dossier à partir du lien collé par l'utilisateur :
 * - lien de navigation (…/Shared Documents/General/…/01- Wakatoon, ou ?id=… dans l'adresse)
 * - lien de partage (« Copier le lien »)
 */
export async function resolveFolderUrl(raw: string): Promise<SpItem> {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new SharePointError("Lien invalide", 400); }
  if (!/\.sharepoint\.com$/i.test(url.hostname)) throw new SharePointError("Ce n'est pas un lien SharePoint", 400);

  // 1) Adresse de navigation : le chemin peut être dans ?id= (vue « Tous les documents »).
  const idParam = url.searchParams.get("id");
  const pathname = decodeURIComponent(idParam ?? url.pathname);
  const m = pathname.match(/\/(Shared Documents|Documents partages|Documents%20partages)\/(.+?)\/?$/i);
  let g: GraphItem;
  if (m && !/\/:[a-z]:\//i.test(url.pathname)) {
    const rel = m[2].split("/").map(encodeURIComponent).join("/");
    g = await graph<GraphItem>(`/drives/${driveId()}/root:/${rel}?$select=${SELECT}`);
  } else {
    // 2) Lien de partage : API « shares » (encodage base64url préfixé par u!).
    const enc = "u!" + Buffer.from(raw.trim()).toString("base64").replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
    g = await graph<GraphItem>(`/shares/${enc}/driveItem?$select=${SELECT}`);
  }
  if (!g.folder) throw new SharePointError("Ce lien pointe vers un fichier : collez le lien du DOSSIER de l'entreprise", 400);
  if (g.parentReference?.driveId && g.parentReference.driveId !== driveId())
    throw new SharePointError("Ce dossier n'est pas dans l'espace partagé « Idawa Capital » (OneDrive personnel ?)", 400);
  return toItem(g);
}

/** Contenu d'un fichier (copie figée d'une pièce présentée en comité). */
export async function downloadFile(itemId: string): Promise<{ item: GraphItem; data: ArrayBuffer }> {
  const item = await getItem(itemId);
  if (item.folder || !item.file) throw new SharePointError("Seuls des fichiers peuvent être ajoutés", 400);
  if ((item.size ?? 0) > 50 * 1024 * 1024) throw new SharePointError(`« ${item.name} » dépasse 50 Mo`, 413);
  const res = await fetch(`${GRAPH}/drives/${driveId()}/items/${encodeURIComponent(itemId)}/content`, {
    headers: { Authorization: `Bearer ${await token()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new SharePointError(`Lecture de « ${item.name} » impossible (${res.status})`, 502);
  return { item, data: await res.arrayBuffer() };
}

export type { GraphItem };
