import { getDashboardData } from "@/lib/data/dashboard";
import { getTodoItems } from "@/lib/data/todo";
import DashboardClient from "@/components/dashboard/DashboardClient";
import TodoBanner from "@/components/dashboard/TodoBanner";
import { createClient } from "@/lib/supabase/server";
import { getMyPermissions, isExternalRole } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [data, todo, { data: { user } }, { perms, roleName }] = await Promise.all([
    getDashboardData(),
    getTodoItems(),
    supabase.auth.getUser(),
    getMyPermissions(),
  ]);
  // La liste complète des actions du fonds est visible par TOUS les rôles internes ;
  // seuls les rôles externes (Auditeur, Observateur / LP) restent limités à « leurs » actions.
  const canSeeAll = !isExternalRole(roleName);
  const canValidateComites = perms.comites === "V";
  return (
    <>
      <TodoBanner data={todo} currentUserId={user?.id ?? ""} canSeeAll={canSeeAll} canValidateComites={canValidateComites} />
      <DashboardClient data={data} />
    </>
  );
}
