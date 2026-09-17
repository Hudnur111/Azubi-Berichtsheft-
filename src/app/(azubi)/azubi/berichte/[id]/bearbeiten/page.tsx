import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { QueryToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { ReportEditor } from "@/components/reports/report-editor";
import { fmtDate, weekdayLong, weekLabel } from "@/lib/dates";

export default async function EditReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAzubi();
  const { id } = await params;
  const sp = await searchParams;
  const report = await db.report.findFirst({ where: { id, azubiId: me.id }, include: { entries: { orderBy: { sortOrder: "asc" } } } });
  if (!report) notFound();
  if (report.status === "SUBMITTED" || report.status === "APPROVED") redirect(`/azubi/berichte/${id}`);

  const templates = await db.template.findMany({
    where: { OR: [{ ownerId: me.id }, { isGlobal: true }, ...(me.departmentId ? [{ departmentId: me.departmentId }] : [])] },
    orderBy: { title: "asc" },
    select: { id: true, title: true, content: true, category: true },
  });

  return (
    <>
      <PageHeader
        title={`${weekLabel(report.year, report.week)} bearbeiten`}
        description={<>{fmtDate(report.weekStart)} – {fmtDate(report.weekEnd)} · <StatusBadge status={report.status} /> · Änderungen werden automatisch gespeichert</>}
        actions={
          <>
            <ButtonLink href="/azubi/berichte" variant="ghost"><ArrowLeft className="h-4 w-4" /> Zurück</ButtonLink>
            <ButtonLink href={`/azubi/berichte/${report.id}`} variant="outline"><Eye className="h-4 w-4" /> Vorschau</ButtonLink>
          </>
        }
      />
      <QueryToast ok={sp.ok} error={sp.error} />
      {report.status === "REJECTED" && report.reviewNote && <Alert tone="error" className="mb-4"><strong>Rückgabe-Grund:</strong> {report.reviewNote}</Alert>}
      <ReportEditor
        reportId={report.id}
        initialSummary={report.summary ?? ""}
        initialEntries={report.entries.map((e) => ({ id: e.id, date: fmtDate(e.date), category: e.category, description: e.description, hours: Number(e.hours) }))}
        templates={templates}
        weekdays={report.entries.map((e) => weekdayLong(new Date(e.date)))}
      />
    </>
  );
}
