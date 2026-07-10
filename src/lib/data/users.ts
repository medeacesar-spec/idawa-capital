import { createClient } from "@/lib/supabase/server";

export type FundUser = { id: string; name: string };

export async function getFundUsers(): Promise<FundUser[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
  return (data ?? []).map((u) => ({ id: u.id, name: u.full_name || u.email || "—" }));
}
