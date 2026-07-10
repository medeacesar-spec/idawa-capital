import { getProgramsForParams } from "@/lib/data/params";
import ParametresClient from "@/components/params/ParametresClient";
import { requirePerm } from "@/lib/auth/permissions";

export default async function ParametresPage() {
  await requirePerm("config", "E");
  const programs = await getProgramsForParams();
  return <ParametresClient programs={programs} />;
}
