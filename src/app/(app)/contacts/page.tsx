import { getContactsData } from "@/lib/data/contacts";
import ContactsClient from "@/components/contacts/ContactsClient";

export default async function ContactsPage() {
  const data = await getContactsData();
  return <ContactsClient data={data} />;
}
