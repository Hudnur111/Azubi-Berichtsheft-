import { notFound } from "next/navigation";
import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrintView } from "@/components/reports/print-view";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAzubi();
  const { id } = await params;
  const report = await db.report.findFirst({
    where: { id, azubiId: me.id },
    include: { entries: { orderBy: { sortOrder: "asc" } }, azubi: { include: { trainer: true } }, reviewer: true, department: true },
  });
  if (!report) notFound();
  return <PrintView report={report} />;
}
