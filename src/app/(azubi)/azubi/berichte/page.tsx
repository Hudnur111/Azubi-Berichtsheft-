import Link from "next/link";
import { CalendarPlus, ChevronRight, FileDown } from "lucide-react";
import { getISODay } from "date-fns";
import type { ReportStatus } from "@prisma/client";
import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { QueryToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, Td, Th } from "@/components/ui/table";
import { Empty } from "@/components/ui/empty";
import { ButtonLink } from "@/components/ui/button";
import { createReportFromForm } from "@/actions/reports";
import { currentWeek, dayKey, expectedWeeks, expectedWorkdays, fmtDate, reportTitle, toDateInput, weekLabel } from "@/lib/dates";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const FILTERS: (ReportStatus | "ALL")[] = ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

export default async function BerichtePage({ searchParams }: { searchParams: Promise<{ status?: string; ok?: string; error?: string }> }) {
  const me = await requireAzubi();
  const daily = me.berichtsheftTyp === "DAILY";
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as ReportStatus) && sp.status !== "ALL" ? (sp.status as ReportStatus) : null;
  const [reports, all] = await Promise.all([
    db.report.findMany({
      where: { azubiId: me.id, ...(status ? { status } : {}) },
      orderBy: [{ year: "desc" }, { week: "desc" }, { day: "desc" }],
      include: { department: { select: { name: true } }, _count: { select: { comments: true, attachments: true } } },
    }),
    db.report.findMany({ where: { azubiId: me.id }, select: { year: true, week: true, day: true } }),
  ]);
  const cw = currentWeek();
  const today = new Date();
  const have = new Set(all.map((r) => dayKey(r.year, r.week, r.day)));
  const missing = daily
    ? expectedWorkdays(me.ausbildungsbeginn).filter((d) => !have.has(dayKey(d.year, d.week, d.day))).map((d) => ({ key: dayKey(d.year, d.week, d.day), label: fmtDate(d.date, "EEEEEE, dd.MM.yyyy"), date: toDateInput(d.date) })).reverse()
    : expectedWeeks(me.ausbildungsbeginn).filter((w) => !have.has(dayKey(w.year, w.week, 0))).map((w) => ({ key: dayKey(w.year, w.week, 0), label: `${weekLabel(w.year, w.week)} · ab ${fmtDate(w.start)}`, year: w.year, week: w.week })).reverse();
  const isCurrent = (r: { year: number; week: number; day: number }) => r.year === cw.year && r.week === cw.week && (daily ? r.day === getISODay(today) : true);
  const years = [...new Set(all.map((r) => r.year))].sort((a, b) => b - a);

  return (
    <>
      <PageHeader title="Meine Berichte" description={`Alle ${daily ? "Tages" : "Wochen"}berichte deiner Ausbildung.`} actions={all.length > 0 && <ButtonLink href="/api/pdf" variant="outline"><FileDown className="h-4 w-4" /> Gesamtes Berichtsheft (PDF)</ButtonLink>} />
      <QueryToast ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title="Berichte"
            action={
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((f) => (
                  <Link key={f} href={f === "ALL" ? "/azubi/berichte" : `/azubi/berichte?status=${f}`} className={cn("rounded-full px-3 py-1 text-xs font-medium", (f === "ALL" && !status) || f === status ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                    {f === "ALL" ? "Alle" : STATUS_LABELS[f]}
                  </Link>
                ))}
              </div>
            }
          />
          {reports.length ? (
            <Table>
              <thead><tr><Th>Bericht</Th><Th>Zeitraum</Th><Th>Abteilung</Th><Th>Status</Th><Th></Th></tr></thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <Td className="font-medium text-slate-900">{reportTitle(r)}{isCurrent(r) && <Badge tone="brand" className="ml-2">aktuell</Badge>}</Td>
                    <Td className="whitespace-nowrap">{r.type === "DAILY" ? weekLabel(r.year, r.week) : `${fmtDate(r.weekStart)} – ${fmtDate(r.weekEnd)}`}</Td>
                    <Td>{r.department?.name ?? "–"}</Td>
                    <Td><StatusBadge status={r.status} />{r._count.comments > 0 && <span className="ml-2 text-xs text-slate-400">{r._count.comments} 💬</span>}{r._count.attachments > 0 && <span className="ml-1 text-xs text-slate-400">{r._count.attachments} 📎</span>}</Td>
                    <Td className="text-right"><Link href={`/azubi/berichte/${r.id}${r.status === "DRAFT" || r.status === "REJECTED" ? "/bearbeiten" : ""}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Öffnen <ChevronRight className="h-4 w-4" /></Link></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <Empty title="Keine Berichte" description="Lege rechts einen neuen Bericht an." />}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={daily ? "Neuer Tagesbericht" : "Neuer Wochenbericht"} description={daily ? "Werktag wählen" : "Woche wählen"} />
            <CardBody>
              <form action={createReportFromForm} className="space-y-3">
                {daily ? (
                  <div><label className="label" htmlFor="date">Datum</label><input id="date" name="date" type="date" defaultValue={toDateInput(today)} max={toDateInput(today)} className="input" required /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="label" htmlFor="week">KW</label><input id="week" name="week" type="number" min={1} max={53} defaultValue={cw.week} className="input" required /></div>
                    <div><label className="label" htmlFor="year">Jahr</label><input id="year" name="year" type="number" min={2000} max={2100} defaultValue={cw.year} className="input" required /></div>
                  </div>
                )}
                <SubmitButton className="w-full" pendingText="Wird angelegt …"><CalendarPlus className="h-4 w-4" /> Anlegen / Öffnen</SubmitButton>
              </form>
            </CardBody>
          </Card>
          {years.length > 1 && (
            <Card>
              <CardHeader title="PDF je Jahr" />
              <CardBody className="flex flex-wrap gap-2">{years.map((y) => <ButtonLink key={y} href={`/api/pdf?year=${y}`} variant="outline" size="sm"><FileDown className="h-3.5 w-3.5" /> {y}</ButtonLink>)}</CardBody>
            </Card>
          )}
          {missing.length > 0 && (
            <Card>
              <CardHeader title={daily ? "Fehlende Werktage" : "Fehlende Wochen"} description={`${missing.length} offen`} />
              <ul className="max-h-80 divide-y divide-slate-100 overflow-auto">
                {missing.slice(0, 60).map((m) => (
                  <li key={m.key}>
                    <form action={createReportFromForm} className="flex items-center justify-between px-5 py-2">
                      {"date" in m ? <input type="hidden" name="date" value={m.date} /> : <><input type="hidden" name="year" value={m.year} /><input type="hidden" name="week" value={m.week} /></>}
                      <span className="text-sm">{m.label}</span>
                      <button className="text-xs font-medium text-brand-600 hover:underline">Anlegen</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
