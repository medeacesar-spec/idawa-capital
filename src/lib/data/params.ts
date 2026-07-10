import { createClient } from "@/lib/supabase/server";

export type ProgramRow = {
  id: string;
  name: string;
  color: string;
  nature: "invest" | "accompagnement" | "mixte";
  status: string;
};

export async function getProgramsForParams(): Promise<ProgramRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("id, name, color, nature, status, position")
    .order("position");
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    nature: p.nature as ProgramRow["nature"],
    status: p.status ?? "Actif",
  }));
}
