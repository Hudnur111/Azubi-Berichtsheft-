import Link from "next/link";
import { CheckCheck, ChevronRight } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/toast";
import { Table, Td, Th } from "@/components/ui/table";
import { Empty } from "@/components/ui/empty";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { SelectNav } from "@/components/ui/select-nav";
import { bulkApprove } from "@/actions/reports";
import { fmtDate, fmtDateTime, weekLabel } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function PruefungPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; dept?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const [reports, departments] = await Promise.all([
    db.report.findMany({
      where: { status: "SUBMITTED", ...reportScope(me), ...(sp.dept ? { departmentId: sp.dept } : {}) },
      orderBy: { submittedAt: "asc" },
      include: { azubi: { select: { firstName: true, lastName: true, beruf: true } }, department: { select: { name: true } }, _count: { select: { comments: true } } },
    }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Prüfung" description={`${reports.length} Bericht(e) warten auf Freigabe.`} />
      <QueryToast ok={sp.ok} error={sp.error} />
      <form action={bulkApprove}>
        <Card>
          <CardHeader
            title="Eingereichte Berichte"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <SelectNav value={sp.dept ?? ""} placeholder="Alle Abteilungen" options={departments.map((d) => ({ value: d.id, label: d.name }))} param="dept" basePath="/admin/pruefung" />
                <SubmitButton size="sm" variant="success" disabled={!reports.length}><CheckCheck className="h-4 w-4" /> Ausgewählte genehmigen</SubmitButton>
              </div>
            }
          />
          {reports.length ? (
            <Table>
              <thead><tr><Th className="w-8"></Th><Th>Azubi</Th><Th>Woche</Th><Th>Abteilung</Th><Th>Eingereicht</Th><Th></Th></tr></thead>
              <tbody>
                {reports.map((r) => {
                  const days = Math.floor((Date.now() - new Date(r.submittedAt ?? r.updatedAt).getTime()) / 86400000);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <Td><input type="checkbox" name="ids" value={r.id} className="h-4 w-4 rounded border-slate-300" aria-label="Auswählen" /></Td>
                      <Td><p className="font-medium text-slate-900">{fullName(r.azubi)}</p><p className="text-xs text-slate-500">{r.azubi.beruf ?? ""}</p></Td>
                      <Td className="whitespace-nowrap">{weekLabel(r.year, r.week)}<br /><span className="text-xs text-slate-500">{fmtDate(r.weekStart)} – {fmtDate(r.weekEnd)}</span></Td>
                      <Td>{r.department?.name ?? "–"}</Td>
                      <Td className="whitespace-nowrap">{fmtDateTime(r.submittedAt)} {days > 5 && <Badge tone="warning" className="ml-1">{days} Tage</Badge>}{r._count.comments > 0 && <span className="ml-2 text-xs text-slate-400">{r._count.comments} 💬</span>}</Td>
                      <Td className="text-right"><Link href={`/admin/berichte/${r.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Prüfen <ChevronRight className="h-4 w-4" /></Link></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : <Empty title="Keine offenen Prüfungen" description="Neue Einreichungen erscheinen hier automatisch." />}
        </Card>
      </form>
    </>
  );
}

