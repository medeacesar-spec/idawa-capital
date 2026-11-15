"use server";

// Bouton « Envoyer les e-mails du jour » (Reporting → Dépôts des entreprises) : lance tout de suite
// l'envoi quotidien. Sans risque de doublon : un message déjà parti n'est jamais renvoyé.

import { revalidatePath } from "next/cache";
import { getMyPermissions, can } from "@/lib/auth/permissions";
import { runReportingMailings } from "@/lib/reporting/mailings";

export async function sendReportingNow(): Promise<{ ok: boolean; message: string; details?: { company: string; period: string; kind: string; to: string; ok: boolean; error?: string }[] }> {
  const { perms } = await getMyPermissions();
  if (!can(perms, "reporting", "E")) return { ok: false, message: "Droit d'écriture sur le reporting requis." };
  const r = await runReportingMailings({ origin: "manuel" });
  revalidatePath("/reporting");
  if (r.skippedNoKey) return { ok: false, message: "L'envoi d'e-mails n'est pas activé : la clé RESEND_API_KEY est absente dans Vercel.", details: r.details };
  const failed = r.details.filter((d) => !d.ok).length;
  const message = r.sent === 0 && failed === 0
    ? "Rien à envoyer aujourd'hui : tous les messages dus sont déjà partis."
    : `${r.sent} e-mail${r.sent > 1 ? "s" : ""} envoyé${r.sent > 1 ? "s" : ""}${failed ? ` · ${failed} échec${failed > 1 ? "s" : ""}` : ""}.`;
  return { ok: failed === 0, message, details: r.details };
}
