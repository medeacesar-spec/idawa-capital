import { getPortfolioData } from "@/lib/data/portfolio";
import PortfolioClient from "@/components/portfolio/PortfolioClient";

export default async function PortefeuillePage() {
  const data = await getPortfolioData();
  return <PortfolioClient data={data} />;
}
