import { redirect } from "next/navigation";
import { getCommitteeSessions, getSessionOptions } from "@/lib/data/committees";
import { can, getMyPermissions, isExternalRole } from "@/lib/auth/permissions";
import SessionsClient from "@/components/comites/SessionsClient";

export default async function ComitesPage() {
  const { perms, roleName } = await getMyPermissions();
  if (!can(perms, "comites", "L") || isExternalRole(roleName)) redirect("/dashboard");
  const [sessions, options] = await Promise.all([getCommitteeSessions(), getSessionOptions()]);
  const canEdit = perms.comites === "E" || perms.comites === "V";
  return <SessionsClient sessions={sessions} programCommittees={options.programCommittees.map((c) => c.name)} canEdit={canEdit} />;
}
