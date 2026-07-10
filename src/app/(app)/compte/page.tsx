import { createClient } from "@/lib/supabase/server";
import AccountClient from "@/components/account/AccountClient";

export default async function ComptePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name, email, roles(name)").eq("id", user?.id ?? "").single();
  return (
    <AccountClient
      userId={user?.id ?? ""}
      email={user?.email ?? profile?.email ?? ""}
      fullName={profile?.full_name ?? ""}
      roleName={(profile?.roles as { name?: string } | null)?.name ?? ""}
    />
  );
}
