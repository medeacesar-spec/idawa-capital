import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QData } from "@/lib/impact/questionnaire";
import PublicQuestionnaireClient from "./PublicQuestionnaireClient";

export const dynamic = "force-dynamic";

export default async function PublicQuestionnairePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("impact_questionnaires")
    .select("entity_type, entity_id, year, data, status")
    .eq("token", token).single();
  if (!row) notFound();

  const table = row.entity_type === "company" ? "portfolio_companies" : "deals";
  const column = row.entity_type === "company" ? "name" : "company_name";
  const { data: ent } = await admin.from(table).select(column).eq("id", row.entity_id).single();
  const entityName = (ent as Record<string, string> | null)?.[column] ?? "votre entreprise";

  return (
    <PublicQuestionnaireClient
      token={token}
      year={row.year}
      entityName={entityName}
      status={row.status}
      initial={(row.data as QData) ?? {}}
    />
  );
}
