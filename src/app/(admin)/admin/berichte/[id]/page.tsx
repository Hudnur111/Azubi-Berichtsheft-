import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileDown, FileEdit, Printer, RotateCcw, XCircle } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope } from "@/lib/permissions";
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
import { AttachmentsCard } from "@/components/reports/attachments-card";
import { approveReport, rejectReport, reopenReport } from "@/actions/reports";
import { fmtDate, fmtDateTime, reportTitle, weekLabel } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function ReviewReport({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const report = await db.report.findFirst({
    where: { id, ...reportScope(me) },
    include: {
      entries: { orderBy: { sortOrder: "asc" } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { firstName: true, lastName: true, role: true } } } },
      azubi: { select: { id: true, firstName: true, lastName: true, beruf: true, ausbildungsjahr: true, trainer: { select: { firstName: true, lastName: true } } } },
      reviewer: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
      attachments: { orderBy: { createdAt: "asc" }, omit: { data: true }, include: { uploadedBy: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!report) notFound();
  const [prev, next] = await Promise.all([
    db.report.findFirst({ where: { status: "SUBMITTED", ...reportScope(me), submittedAt: { lt: report.submittedAt ?? new Date(0) } }, orderBy: { submittedAt: "desc" }, select: { id: true } }),
    db.report.findFirst({ where: { status: "SUBMITTED", ...reportScope(me), submittedAt: { gt: report.submittedAt ?? new Date(0) } }, orderBy: { submittedAt: "asc" }, select: { id: true } }),
  ]);

  return (
    <>
      <PageHeader
        title={`${fullName(report.azubi)} · ${reportTitle(report)}`}
        description={<>{report.type === "DAILY" ? weekLabel(report.year, report.week) : `${fmtDate(report.weekStart)} – ${fmtDate(report.weekEnd)}`} · {report.department?.name ?? "ohne Abteilung"} · <StatusBadge status={report.status} /> · <Link href={`/admin/azubis/${report.azubi.id}`} className="text-brand-600 hover:underline">Azubi-Akte</Link></>}
        actions={
          <>
            <ButtonLink href="/admin/pruefung" variant="ghost"><ArrowLeft className="h-4 w-4" /> Warteschlange</ButtonLink>
            <ButtonLink href={`/api/pdf?report=${report.id}`} variant="outline"><FileDown className="h-4 w-4" /> PDF</ButtonLink>
            <ButtonLink href={`/admin/berichte/${report.id}/drucken`} variant="ghost" title="Druckansicht"><Printer className="h-4 w-4" /></ButtonLink>
            {report.status !== "APPROVED" && <ButtonLink href={`/admin/berichte/${report.id}/bearbeiten`} variant="outline"><FileEdit className="h-4 w-4" /> Bearbeiten</ButtonLink>}
            {report.status === "SUBMITTED" && (prev || next) && (
              <div className="flex gap-1">{prev && <ButtonLink href={`/admin/berichte/${prev.id}`} variant="outline" size="md">‹</ButtonLink>}{next && <ButtonLink href={`/admin/berichte/${next.id}`} variant="outline" size="md">›</ButtonLink>}</div>
            )}
          </>
        }
      />
      <QueryToast ok={sp.ok} error={sp.error} />
      {report.status === "APPROVED" && <Alert tone="success" className="mb-4">Genehmigt am {fmtDateTime(report.reviewedAt)}{report.reviewer && <> von {fullName(report.reviewer)}</>}.{report.reviewNote && <> Anmerkung: {report.reviewNote}</>}</Alert>}
      {report.status === "REJECTED" && <Alert tone="error" className="mb-4">Zurückgegeben am {fmtDateTime(report.reviewedAt)}: {report.reviewNote}</Alert>}
      {report.status === "DRAFT" && <Alert tone="info" className="mb-4">Entwurf – der Azubi hat diesen Bericht noch nicht eingereicht.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Tageseinträge" description={`Version ${report.version} · eingereicht ${fmtDateTime(report.submittedAt)}`} />
          <EntriesTable entries={report.entries} />
          {report.summary && <CardBody className="border-t border-slate-100"><p className="text-xs font-semibold uppercase text-slate-500">Wochenzusammenfassung</p><p className="mt-1 whitespace-pre-wrap text-sm">{report.summary}</p></CardBody>}
        </Card>
        <div className="space-y-6">
          {report.status === "SUBMITTED" && (
            <Card className="border-brand-200">
              <CardHeader title="Entscheidung" description="Genehmigen oder mit Begründung zurückgeben" />
              <CardBody className="space-y-3">
                <form action={approveReport} className="space-y-2">
                  <input type="hidden" name="reportId" value={report.id} />
                  <textarea name="note" rows={2} maxLength={1000} className="input" placeholder="Optionale Anmerkung zur Genehmigung" />
                  <SubmitButton variant="success" className="w-full" pendingText="Wird genehmigt …"><CheckCircle2 className="h-4 w-4" /> Genehmigen</SubmitButton>
                </form>
                <form action={rejectReport} className="space-y-2 border-t border-slate-100 pt-3">
                  <input type="hidden" name="reportId" value={report.id} />
                  <textarea name="note" rows={3} maxLength={1000} required className="input" placeholder="Begründung für die Rückgabe (Pflicht) – z. B. zu unkonkret, Stunden fehlen …" />
                  <SubmitButton variant="danger" className="w-full" pendingText="Wird zurückgegeben …"><XCircle className="h-4 w-4" /> Zurückgeben</SubmitButton>
                </form>
              </CardBody>
            </Card>
          )}
          {report.status === "APPROVED" && me.role === "ADMIN" && (
            <ConfirmForm action={reopenReport} confirm="Genehmigung zurücknehmen und Bericht wieder zur Prüfung öffnen?">
              <input type="hidden" name="reportId" value={report.id} />
              <SubmitButton variant="outline" size="sm"><RotateCcw className="h-4 w-4" /> Wieder öffnen</SubmitButton>
            </ConfirmForm>
          )}
          <Card>
            <CardHeader title="Azubi" />
            <dl className="divide-y divide-slate-100 text-sm">
              {([["Name", fullName(report.azubi)], ["Beruf", report.azubi.beruf ?? "–"], ["Ausbildungsjahr", report.ausbildungsjahr ?? report.azubi.ausbildungsjahr ?? "–"], ["Ausbilder/in", report.azubi.trainer ? fullName(report.azubi.trainer) : "–"]] as [string, React.ReactNode][]).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] px-5 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <AttachmentsCard reportId={report.id} attachments={report.attachments} canUpload meId={me.id} isAdmin={me.role === "ADMIN"} locked={false} />
          <CommentsCard comments={report.comments} form={<CommentForm reportId={report.id} />} />
        </div>
      </div>
    </>
  );
}
