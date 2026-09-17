import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { ReportEditor } from "@/components/reports/report-editor";
import { fmtDate, reportTitle, weekdayLong } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function StaffEditReport({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const report = await db.report.findFirst({ where: { id, ...reportScope(me) }, include: { entries: { orderBy: { sortOrder: "asc" } }, azubi: { select: { id: true, firstName: true, lastName: true, departmentId: true } } } });
  if (!report) notFound();
  if (report.status === "APPROVED") redirect(`/admin/berichte/${id}?error=${encodeURIComponent("Genehmigte Berichte zuerst wieder öffnen.")}`);
  const templates = await db.template.findMany({
    where: { OR: [{ ownerId: me.id }, { isGlobal: true }, ...(report.azubi.departmentId ? [{ departmentId: report.azubi.departmentId }] : [])] },
    orderBy: { title: "asc" }, select: { id: true, title: true, content: true, category: true },
  });
  return (
    <>
      <PageHeader
        title={`${reportTitle(report)} bearbeiten`}
        description={<>{fullName(report.azubi)} · <StatusBadge status={report.status} /></>}
        actions={<ButtonLink href={`/admin/berichte/${report.id}`} variant="ghost"><ArrowLeft className="h-4 w-4" /> Zurück zur Prüfung</ButtonLink>}
      />
      <Alert tone="info" className="mb-4">Du bearbeitest den Bericht des Azubis. Änderungen werden erst mit „Speichern“ übernommen, protokolliert und dem Azubi als Kommentar und Mitteilung angezeigt.</Alert>
      <ReportEditor
        mode="staff"
        reportId={report.id}
        initialSummary={report.summary ?? ""}
        initialEntries={report.entries.map((e) => ({ id: e.id, date: fmtDate(e.date), category: e.category, description: e.description, hours: Number(e.hours) }))}
        templates={templates}
        weekdays={report.entries.map((e) => weekdayLong(new Date(e.date)))}
      />
    </>
  );
}
