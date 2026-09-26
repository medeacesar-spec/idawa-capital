import { createClient } from "@/lib/supabase/client";

// Un document est soit un fichier téléversé dans l'app (storage_path), soit un lien
// vers un fichier resté sur OneDrive / SharePoint (url). Les écrans passent tous par ici.
export type OpenableDoc = { storagePath: string | null; url?: string | null };

export function hasTarget(d: OpenableDoc): boolean {
  return !!(d.storagePath || d.url);
}

export async function openDocument(d: OpenableDoc) {
  if (d.url) { window.open(d.url, "_blank", "noopener,noreferrer"); return; }
  if (!d.storagePath) return;
  const { data } = await createClient().storage.from("documents").createSignedUrl(d.storagePath, 120);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
}

// Lien vers un OneDrive PERSONNEL : les autres membres de l'équipe n'y ont accès
// que si le fichier leur a été partagé un par un — d'où l'avertissement à la saisie.
export function isPersonalOneDrive(url: string): boolean {
  return /-my\.sharepoint\.com\/.*personal\//i.test(url);
}

export function isValidLink(url: string): boolean {
  try { return new URL(url.trim()).protocol === "https:"; } catch { return false; }
}

// Titre proposé à partir du lien, seulement s'il se termine par un vrai nom de fichier
// (un lien « Copier le lien » SharePoint finit par un jeton illisible : on ne propose rien).
export function titleFromUrl(url: string): string {
  try {
    const last = decodeURIComponent(new URL(url.trim()).pathname.split("/").filter(Boolean).pop() ?? "");
    return /\.[a-z0-9]{2,5}$/i.test(last) ? last.replace(/\.[^.]+$/, "") : "";
  } catch { return ""; }
}
