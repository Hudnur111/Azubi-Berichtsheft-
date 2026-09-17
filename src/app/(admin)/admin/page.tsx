import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, GraduationCap, Hourglass, XCircle } from "lucide-react";
import { subDays } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { holidayMap } from "@/lib/holidays";
import { getSettings } from "@/lib/settings";
import { azubiScope, reportScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { currentWeek, fmtDateTime, missingUnits, reportTitle, weekLabel } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function AdminDashboard() {
  const me = await requireStaff();
  const scope = reportScope(me);
  const weekAgo = subDays(new Date(), 7);
  const [pending, approvedWeek, rejectedWeek, azubis, recent, byDept] = await Promise.all([
    db.report.count({ where: { status: "SUBMITTED", ...scope } }),
    db.report.count({ where: { status: "APPROVED", reviewedAt: { gte: weekAgo }, ...scope } }),
    db.report.count({ where: { status: "REJECTED", reviewedAt: { gte: weekAgo }, ...scope } }),
    db.user.findMany({ where: { active: true, ...azubiScope(me) }, select: { id: true, firstName: true, lastName: true, ausbildungsbeginn: true, berichtsheftTyp: true, department: { select: { name: true } }, reports: { select: { year: true, week: true, day: true, status: true } } } }),
    db.report.findMany({ where: { status: "SUBMITTED", ...scope }, orderBy: { submittedAt: "asc" }, take: 8, include: { azubi: { select: { firstName: true, lastName: true } }, department: { select: { name: true } } } }),
    db.report.groupBy({ by: ["departmentId"], where: { status: "SUBMITTED", ...scope }, _count: { _all: true } }),
  ]);
  const depts = await db.department.findMany({ where: { id: { in: byDept.map((d) => d.departmentId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const cw = currentWeek();
  const holidays = holidayMap([cw.year - 1, cw.year], (await getSettings()).bundesland);
  const overdue = azubis
    .map((a) => ({ ...a, missing: missingUnits(a.berichtsheftTyp, a.ausbildungsbeginn, a.reports, new Date(), holidays).length }))
    .filter((a) => a.missing > 0)
    .sort((a, b) => b.missing - a.missing);
  const oldest = recent[0]?.submittedAt;
  const waitDays = oldest ? Math.floor((Date.now() - new Date(oldest).getTime()) / 86400000) : 0;

  return (
    <>
      <PageHeader title={`Guten Tag, ${me.firstName}`} description={`${weekLabel(cw.year, cw.week)} · Überblick über Prüfungen und Auszubildende`} actions={pending > 0 && <ButtonLink href="/admin/pruefung"><ClipboardCheck className="h-4 w-4" /> {pending} Bericht(e) prüfen</ButtonLink>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <Stat label="Zur Prüfung" value={pending} icon={ClipboardCheck} tone={pending ? "brand" : "neutral"} />
        <Stat label="Genehmigt (7 Tage)" value={approvedWeek} icon={CheckCircle2} tone="success" />
        <Stat label="Zurückgegeben (7 Tage)" value={rejectedWeek} icon={XCircle} tone="danger" />
        <Stat label="Aktive Azubis" value={azubis.length} icon={GraduationCap} tone="neutral" />
        <Stat label="Längste Wartezeit" value={`${waitDays} Tage`} icon={Hourglass} tone={waitDays > 5 ? "warning" : "neutral"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Warteschlange" description="Älteste Einreichungen zuerst" action={<Link href="/admin/pruefung" className="text-sm text-brand-600 hover:underline">Alle</Link>} />
          {recent.length ? (
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/berichte/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0"><p className="truncate font-medium text-slate-900">{fullName(r.azubi)} · {reportTitle(r)}</p><p className="text-xs text-slate-500">{r.department?.name ?? "–"} · eingereicht {fmtDateTime(r.submittedAt)}</p></div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <CardBody className="text-sm text-slate-500">Keine offenen Prüfungen. 👍</CardBody>}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Offen je Abteilung" />
            {byDept.length ? (
              <ul className="divide-y divide-slate-100">
                {byDept.map((d) => <li key={d.departmentId ?? "none"} className="flex items-center justify-between px-5 py-2.5 text-sm"><span>{depts.find((x) => x.id === d.departmentId)?.name ?? "Ohne Abteilung"}</span><Badge tone="brand">{d._count._all}</Badge></li>)}
              </ul>
            ) : <CardBody className="text-sm text-slate-500">Keine offenen Berichte.</CardBody>}
          </Card>
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Rückstände</span>} description="Azubis mit fehlenden Wochen" />
            {overdue.length ? (
              <ul className="divide-y divide-slate-100">
                {overdue.slice(0, 6).map((a) => <li key={a.id}><Link href={`/admin/azubis/${a.id}`} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-slate-50"><span>{fullName(a)}<span className="ml-1 text-xs text-slate-400">{a.department?.name}</span></span><Badge tone={a.missing > 3 ? "danger" : "warning"}>{a.missing} {a.berichtsheftTyp === "DAILY" ? "Tage" : "Wo."}</Badge></Link></li>)}
              </ul>
            ) : <CardBody className="text-sm text-slate-500">Alle Berichte sind auf Stand.</CardBody>}
          </Card>
        </div>
      </div>
    </>
  );
}
