import { getDashboardData } from "@/lib/data/dashboard";
import { getTodoItems } from "@/lib/data/todo";
import DashboardClient from "@/components/dashboard/DashboardClient";
import TodoBanner from "@/components/dashboard/TodoBanner";

export default async function DashboardPage() {
  const [data, todo] = await Promise.all([getDashboardData(), getTodoItems()]);
  return (
    <>
      <TodoBanner data={todo} />
      <DashboardClient data={data} />
    </>
  );
}
