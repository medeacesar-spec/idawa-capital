import { getAuditLog } from "@/lib/data/audit";
import { getActivity } from "@/lib/data/activity";
import { requirePerm } from "@/lib/auth/permissions";
import AuditExportButton from "@/components/journal/AuditExportButton";
import JournalClient from "@/components/journal/JournalClient";
import ActivityPanel from "@/components/journal/ActivityPanel";

export default async function JournalPage() {
  await requirePerm("users");
  // Assez large pour couvrir plusieurs semaines d'activité sans pagination serveur ;
  // l'export reste la voie pour tout reprendre.
  const [entries, activity] = await Promise.all([getAuditLog(400), getActivity(30)]);

  return (
    <div>
      <ActivityPanel data={activity} />

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
