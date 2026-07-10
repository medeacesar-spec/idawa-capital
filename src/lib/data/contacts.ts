import { createClient } from "@/lib/supabase/server";

export type Contact = {
  id: string;
  name: string;
  function: string | null;
  organization: string | null;
  orgType: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  instagram: string | null;
};

export type ContactGroup = { organization: string; orgType: string | null; contacts: Contact[] };

export type ContactsData = {
  groups: ContactGroup[];
  orgTypes: string[];
  total: number;
};

export async function getContactsData(): Promise<ContactsData> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, function, organization, org_type, email, phone, whatsapp, website, linkedin, twitter, instagram")
    .order("organization");

  const contacts: Contact[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    function: c.function,
    organization: c.organization,
    orgType: c.org_type,
    email: c.email,
    phone: c.phone,
    whatsapp: c.whatsapp,
    website: c.website,
    linkedin: c.linkedin,
    twitter: c.twitter,
    instagram: c.instagram,
  }));

  const map = new Map<string, ContactGroup>();
  for (const c of contacts) {
    const org = c.organization ?? "Autre";
    if (!map.has(org)) map.set(org, { organization: org, orgType: c.orgType, contacts: [] });
    map.get(org)!.contacts.push(c);
  }

  const orgTypes = Array.from(new Set(contacts.map((c) => c.orgType).filter(Boolean))) as string[];

  return { groups: Array.from(map.values()), orgTypes, total: contacts.length };
}
