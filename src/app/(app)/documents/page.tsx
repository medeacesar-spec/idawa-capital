import { getDocumentsData } from "@/lib/data/documents";
import DocumentsClient from "@/components/documents/DocumentsClient";

export default async function DocumentsPage() {
  const data = await getDocumentsData();
  return <DocumentsClient data={data} />;
}
