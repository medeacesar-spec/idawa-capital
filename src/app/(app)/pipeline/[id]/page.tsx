import { notFound } from "next/navigation";
import { getDealDetail } from "@/lib/data/dealDetail";
import DealDetailClient from "@/components/pipeline/DealDetailClient";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDealDetail(id);
  if (!deal) notFound();
  return <DealDetailClient deal={deal} />;
}
