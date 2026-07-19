import { getAuditLog } from "@/lib/data/audit";
import { requirePerm } from "@/lib/auth/permissions";
import AuditExportButton from "@/components/journal/AuditExportButton";
import JournalClient from "@/components/journal/JournalClient";

export default async function JournalPage() {
  await requirePerm("users");
  // Assez large pour couvrir plusieurs semaines d'activité sans pagination serveur ;
  // l'export reste la voie pour tout reprendre.
  const entries = await getAuditLog(400);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>
          Historique des créations, modifications et suppressions, avec le détail de ce qui a changé
          ({entries.length} dernières entrées). L&apos;export contient tout le journal.
        </div>
        <AuditExportButton />
      </div>
      <JournalClient entries={entries} />
    </div>
  );
}
