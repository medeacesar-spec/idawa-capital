import { notFound, redirect } from "next/navigation";
import { getCommitteeSession, getSessionOptions } from "@/lib/data/committees";
import { can, getMyPermissions, isExternalRole } from "@/lib/auth/permissions";
import SessionDetailClient from "@/components/comites/SessionDetailClient";

export default async function ComiteSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { perms, roleName } = await getMyPermissions();
  if (!can(perms, "comites", "L") || isExternalRole(roleName)) redirect("/dashboard");
  const [session, options] = await Promise.all([getCommitteeSession(id), getSessionOptions()]);
  if (!session) notFound();
  return <SessionDetailClient session={session} options={options} canEdit={perms.comites === "E" || perms.comites === "V"} />;
}
