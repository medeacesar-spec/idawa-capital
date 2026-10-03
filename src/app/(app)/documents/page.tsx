import { getDocumentsData } from "@/lib/data/documents";
import DocumentsClient from "@/components/documents/DocumentsClient";
import { getMyPermissions, can, isExternalRole } from "@/lib/auth/permissions";

export default async function DocumentsPage() {
  const [data, { perms, roleName }] = await Promise.all([getDocumentsData(), getMyPermissions()]);
  // L'espace partagé SharePoint est lu avec les droits de l'application : réservé à l'équipe.
  return <DocumentsClient data={data} canEdit={can(perms, "documents", "E")} showSharePoint={!isExternalRole(roleName)} />;
}
