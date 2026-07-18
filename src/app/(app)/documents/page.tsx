import { getDocumentsData } from "@/lib/data/documents";
import DocumentsClient from "@/components/documents/DocumentsClient";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export default async function DocumentsPage() {
  const [data, { perms }] = await Promise.all([getDocumentsData(), getMyPermissions()]);
  return <DocumentsClient data={data} canEdit={can(perms, "portefeuille", "E")} />;
}
