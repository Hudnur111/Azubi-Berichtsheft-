import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileEdit, FilePlus2, Flame } from "lucide-react";
import { getISODay } from "date-fns";
import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { currentWeek, dayKey, expectedWeeks, expectedWorkdays, fmtDate, reportTitle, weekLabel } from "@/lib/dates";
import { openOrCreateReport } from "@/actions/reports";
import { holidayMap } from "@/lib/holidays";
import { getSettings } from "@/lib/settings";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AzubiDashboard() {
  const me = await requireAzubi();
  const daily = me.berichtsheftTyp === "DAILY";
  const reports = await db.report.findMany({ where: { azubiId: me.id }, orderBy: [{ year: "desc" }, { week: "desc" }, { day: "desc" }], select: { id: true, type: true, year: true, week: true, day: true, status: true, updatedAt: true, weekStart: true } });
  const counts = { total: reports.length, approved: 0, submitted: 0, rejected: 0, draft: 0 };
  for (const r of reports) {
    if (r.status === "APPROVED") counts.approved++;
    else if (r.status === "SUBMITTED") counts.submitted++;
    else if (r.status === "REJECTED") counts.rejected++;
    else counts.draft++;
  }
  const cw = currentWeek();
  const today = new Date();
  const holidays = holidayMap([today.getFullYear() - 1, today.getFullYear()], (await getSettings()).bundesland);
  const todayIso = getISODay(today);
  const have = new Set(reports.map((r) => dayKey(r.year, r.week, r.day)));
  const ok = new Set(reports.filter((r) => r.status !== "DRAFT" && r.status !== "REJECTED").map((r) => dayKey(r.year, r.week, r.day)));

  // Fehlende Einheiten (Wochen oder Werktage), aktuelle Einheit ausgenommen
  const expected = daily
    ? expectedWorkdays(me.ausbildungsbeginn, today, holidays).map((d) => ({ key: dayKey(d.year, d.week, d.day), label: `${fmtDate(d.date, "EEEEEE dd.MM.")}`, current: d.year === cw.year && d.week === cw.week && d.day === todayIso, year: d.year, week: d.week, day: d.day }))
    : expectedWeeks(me.ausbildungsbeginn).map((w) => ({ key: dayKey(w.year, w.week, 0), label: weekLabel(w.year, w.week), current: w.year === cw.year && w.week === cw.week, year: w.year, week: w.week, day: 0 }));
  const missing = expected.filter((e) => !have.has(e.key) && !e.current);
  const currentKey = daily ? dayKey(cw.year, cw.week, todayIso) : dayKey(cw.year, cw.week, 0);
  const current = reports.find((r) => dayKey(r.year, r.week, r.day) === currentKey);
  const attention = reports.filter((r) => r.status === "REJECTED" || r.status === "DRAFT").slice(0, 5);

  let streak = 0;
  for (const e of [...expected].reverse()) { if (e.current) continue; if (ok.has(e.key)) streak++; else break; }

  const canCreateToday = !daily || todayIso <= 5;
  const createCurrent = openOrCreateReport.bind(null, cw.year, cw.week, daily ? todayIso : 0);

  return (
    <>
      <PageHeader
        title={`Hallo ${me.firstName} 👋`}
        description={`${weekLabel(cw.year, cw.week)} · ${daily ? "Tagesberichte" : "Wochenberichte"} · ${me.beruf ?? "Auszubildende/r"}${me.ausbildungsjahr ? ` · ${me.ausbildungsjahr}. Ausbildungsjahr` : ""}`}
        actions={
          current ? (
            <ButtonLink href={`/azubi/berichte/${current.id}${current.status === "DRAFT" || current.status === "REJECTED" ? "/bearbeiten" : ""}`}><FileEdit className="h-4 w-4" /> {daily ? "Heutigen Bericht öffnen" : "Aktuelle Woche öffnen"}</ButtonLink>
          ) : canCreateToday ? (
            <form action={createCurrent}><SubmitButton pendingText="Wird angelegt …"><FilePlus2 className="h-4 w-4" /> {daily ? "Bericht für heute" : "Bericht für diese Woche"}</SubmitButton></form>
          ) : (
            <ButtonLink href="/azubi/berichte" variant="outline"><FilePlus2 className="h-4 w-4" /> Bericht anlegen</ButtonLink>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Genehmigt" value={counts.approved} icon={CheckCircle2} tone="success" />
        <Stat label="In Prüfung" value={counts.submitted} icon={Clock} tone="brand" />
        <Stat label="Zurückgegeben / Entwurf" value={counts.rejected + counts.draft} icon={FileEdit} tone={counts.rejected ? "danger" : "neutral"} />
        <Stat label="Serie" value={`${streak} ${daily ? "Tage" : "Wo."}`} icon={Flame} tone="warning" hint={`${daily ? "Werktage" : "Wochen"} in Folge pünktlich eingereicht`} />
      </div>

      {missing.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/60">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">{missing.length} {daily ? "Werktag(e)" : "Woche(n)"} ohne Bericht</p>
                <p className="text-sm text-amber-800">{missing.slice(-6).map((e) => e.label).join(", ")}{missing.length > 6 ? " …" : ""}</p>
              </div>
            </div>
            <ButtonLink href="/azubi/berichte" variant="outline" size="sm">Nachtragen <ArrowRight className="h-4 w-4" /></ButtonLink>
          </CardBody>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Braucht Aufmerksamkeit" description="Entwürfe und zurückgegebene Berichte" />
          {attention.length ? (
            <ul className="divide-y divide-slate-100">
              {attention.map((r) => (
                <li key={r.id}>
                  <Link href={`/azubi/berichte/${r.id}/bearbeiten`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div><p className="font-medium">{reportTitle(r)}</p><p className="text-xs text-slate-500">ab {fmtDate(r.weekStart)}</p></div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <CardBody className="text-sm text-slate-500">Alles erledigt. 🎉</CardBody>}
        </Card>
        <Card>
          <CardHeader title="Zuletzt bearbeitet" action={<Link href="/azubi/berichte" className="text-sm text-brand-600 hover:underline">Alle</Link>} />
          {reports.length ? (
            <ul className="divide-y divide-slate-100">
              {reports.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={`/azubi/berichte/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                    <div><p className="font-medium">{reportTitle(r)}</p><p className="text-xs text-slate-500">geändert {fmtDate(r.updatedAt, "dd.MM.yyyy HH:mm")}</p></div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <CardBody className="text-sm text-slate-500">Noch keine Berichte. Leg jetzt deinen ersten Bericht an.</CardBody>}
        </Card>
      </div>
    </>
  );
}
