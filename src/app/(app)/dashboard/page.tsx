import { getDashboardData } from "@/lib/data/dashboard";
import { getTodoItems } from "@/lib/data/todo";
import DashboardClient from "@/components/dashboard/DashboardClient";
import TodoBanner from "@/components/dashboard/TodoBanner";
import { createClient } from "@/lib/supabase/server";
import { getMyPermissions, can } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [data, todo, { data: { user } }, { perms }] = await Promise.all([
    getDashboardData(),
    getTodoItems(),
    supabase.auth.getUser(),
    getMyPermissions(),
  ]);
  const canSeeAll = can(perms, "consolide");
  return (
    <>
      <TodoBanner data={todo} currentUserId={user?.id ?? ""} canSeeAll={canSeeAll} />
      <DashboardClient data={data} />
    </>
  );
}
