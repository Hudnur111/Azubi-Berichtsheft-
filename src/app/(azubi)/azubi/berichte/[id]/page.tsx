import { notFound } from "next/navigation";
import { ArrowLeft, FileEdit, Printer, Send, Trash2, Undo2 } from "lucide-react";
import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { QueryToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { CommentsCard, EntriesTable } from "@/components/reports/report-view";
import { CommentForm } from "@/components/reports/comment-form";
import { deleteDraft, submitReport, withdrawReport } from "@/actions/reports";
import { fmtDate, fmtDateTime, weekLabel } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function ReportDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAzubi();
  const { id } = await params;
  const sp = await searchParams;
  const report = await db.report.findFirst({
    where: { id, azubiId: me.id },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { firstName: true, lastName: true, role: true } } } },
      reviewer: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
    },
  });
  if (!report) notFound();
  const editable = report.status === "DRAFT" || report.status === "REJECTED";

  return (
    <>
      <PageHeader
        title={weekLabel(report.year, report.week)}
        description={<>{fmtDate(report.weekStart)} – {fmtDate(report.weekEnd)}{report.department && <> · {report.department.name}</>} · <StatusBadge status={report.status} /></>}
        actions={
          <>
            <ButtonLink href="/azubi/berichte" variant="ghost"><ArrowLeft className="h-4 w-4" /> Zurück</ButtonLink>
            <ButtonLink href={`/azubi/berichte/${report.id}/drucken`} variant="outline"><Printer className="h-4 w-4" /> PDF</ButtonLink>
            {editable && <ButtonLink href={`/azubi/berichte/${report.id}/bearbeiten`}><FileEdit className="h-4 w-4" /> Bearbeiten</ButtonLink>}
            {editable && (
              <form action={submitReport}><input type="hidden" name="reportId" value={report.id} /><SubmitButton variant="success" pendingText="Wird eingereicht …"><Send className="h-4 w-4" /> Einreichen</SubmitButton></form>
            )}
            {report.status === "SUBMITTED" && (
              <ConfirmForm action={withdrawReport} confirm="Bericht zurückziehen und weiter bearbeiten?"><input type="hidden" name="reportId" value={report.id} /><SubmitButton variant="outline"><Undo2 className="h-4 w-4" /> Zurückziehen</SubmitButton></ConfirmForm>
            )}
          </>
        }
      />
      <QueryToast ok={sp.ok} error={sp.error} />

      {report.status === "REJECTED" && report.reviewNote && (
        <Alert tone="error" className="mb-4"><strong>Zurückgegeben von {report.reviewer ? fullName(report.reviewer) : "Ausbilder/in"}:</strong> {report.reviewNote}</Alert>
      )}
      {report.status === "APPROVED" && (
        <Alert tone="success" className="mb-4">Genehmigt am {fmtDateTime(report.reviewedAt)}{report.reviewer && <> von {fullName(report.reviewer)}</>}.{report.reviewNote && <> Anmerkung: {report.reviewNote}</>}</Alert>
      )}
      {report.status === "SUBMITTED" && <Alert tone="info" className="mb-4">Eingereicht am {fmtDateTime(report.submittedAt)} – wartet auf Prüfung.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Tageseinträge" description={`Version ${report.version}`} />
          <EntriesTable entries={report.entries} />
          {report.summary && <CardBody className="border-t border-slate-100"><p className="text-xs font-semibold uppercase text-slate-500">Wochenzusammenfassung</p><p className="mt-1 whitespace-pre-wrap text-sm">{report.summary}</p></CardBody>}
        </Card>
        <div className="space-y-6">
          <CommentsCard comments={report.comments} form={<CommentForm reportId={report.id} />} />
          {editable && (
            <ConfirmForm action={deleteDraft} confirm="Diesen Entwurf wirklich löschen?">
              <input type="hidden" name="reportId" value={report.id} />
              <SubmitButton variant="ghost" size="sm" className="text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Entwurf löschen</SubmitButton>
            </ConfirmForm>
          )}
        </div>
      </div>
    </>
  );
}
