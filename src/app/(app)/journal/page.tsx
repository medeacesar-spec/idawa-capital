import { getAuditLog } from "@/lib/data/audit";
import { getActivity } from "@/lib/data/activity";
import { requirePerm } from "@/lib/auth/permissions";
import AuditExportButton from "@/components/journal/AuditExportButton";
import JournalClient from "@/components/journal/JournalClient";
import ActivityPanel from "@/components/journal/ActivityPanel";
import AccessLog from "@/components/journal/AccessLog";
import JournalTabs from "@/components/journal/JournalTabs";

export default async function JournalPage() {
  await requirePerm("users");
  const [entries, activity] = await Promise.all([getAuditLog(400), getActivity(30)]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 12 }}>
        <AuditExportButton />
      </div>
      <JournalTabs
        failures={activity.failures}
        activity={<ActivityPanel data={activity} />}
        changes={
          <div>
            <div style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 10 }}>
              Créations, modifications et suppressions avec le détail de ce qui a changé
              ({entries.length} dernières entrées). L&apos;export contient tout le journal.
            </div>
            <JournalClient entries={entries} />
          </div>
        }
        access={<AccessLog data={activity} />}
      />
    </div>
  );
}
