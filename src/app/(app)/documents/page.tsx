import { getDocumentsData } from "@/lib/data/documents";
import { getSharePointDirectory } from "@/lib/data/sharepointDirectory";
import DocumentsClient from "@/components/documents/DocumentsClient";
import { getMyPermissions, can, isExternalRole } from "@/lib/auth/permissions";

export default async function DocumentsPage() {
  const [data, { perms, roleName }] = await Promise.all([getDocumentsData(), getMyPermissions()]);
  // Les dossiers SharePoint sont lus avec les droits de l'application : réservés à l'équipe.
  const spGroups = isExternalRole(roleName) ? null : await getSharePointDirectory(perms);
  return <DocumentsClient data={data} canEdit={can(perms, "documents", "E")} spGroups={spGroups} />;
}
