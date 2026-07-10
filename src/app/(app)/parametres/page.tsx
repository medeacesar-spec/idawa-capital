import { getProgramsForParams } from "@/lib/data/params";
import ParametresClient from "@/components/params/ParametresClient";

export default async function ParametresPage() {
  const programs = await getProgramsForParams();
  return <ParametresClient programs={programs} />;
}
