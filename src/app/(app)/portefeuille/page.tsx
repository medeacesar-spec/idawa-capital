import { getPortfolioData } from "@/lib/data/portfolio";
import PortfolioClient from "@/components/portfolio/PortfolioClient";
import { getMyPermissions, can, requirePerm } from "@/lib/auth/permissions";

export default async function PortefeuillePage() {
  await requirePerm("portefeuille");
  const [data, { perms }] = await Promise.all([getPortfolioData(), getMyPermissions()]);
  // « Lecture » consulte ; seul « Édition » voit les actions d'écriture.
  return <PortfolioClient data={data} canEdit={can(perms, "portefeuille", "E")} />;
}
