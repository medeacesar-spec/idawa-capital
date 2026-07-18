import { getContactsData } from "@/lib/data/contacts";
import ContactsClient from "@/components/contacts/ContactsClient";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export default async function ContactsPage() {
  const [data, { perms }] = await Promise.all([getContactsData(), getMyPermissions()]);
  // Le répertoire global a son propre domaine de permission, réglable dans la matrice
  // des rôles. Les contacts rattachés à un dossier ou une société restent gouvernés par la
  // permission de la fiche (pipeline ou portefeuille), là où se fait le travail quotidien.
  return <ContactsClient data={data} canEdit={can(perms, "contacts", "E")} />;
}
