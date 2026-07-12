"use server";

import { getAuditForExport } from "@/lib/data/audit";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export async function exportAudit() {
  const { perms } = await getMyPermissions();
  if (!can(perms, "users")) return { error: "Accès réservé." };
  return { ok: true, entries: await getAuditForExport() };
}
