import { getContactsData } from "@/lib/data/contacts";
import ContactsClient from "@/components/contacts/ContactsClient";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export default async function ContactsPage() {
  const [data, { perms }] = await Promise.all([getContactsData(), getMyPermissions()]);
  // Le répertoire GLOBAL suit le portefeuille, domaine de référence. Les contacts et
  // documents propres à un dossier restent modifiables depuis la fiche du dossier, où
  // c'est la permission « pipeline » qui s'applique.
  return <ContactsClient data={data} canEdit={can(perms, "portefeuille", "E")} />;
}
