import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileEdit, FilePlus2, Flame } from "lucide-react";
import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { currentWeek, expectedWeeks, fmtDate, weekLabel } from "@/lib/dates";
import { openOrCreateReport } from "@/actions/reports";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function AzubiDashboard() {
  const me = await requireAzubi();
  const reports = await db.report.findMany({ where: { azubiId: me.id }, orderBy: [{ year: "desc" }, { week: "desc" }], select: { id: true, year: true, week: true, status: true, updatedAt: true, weekStart: true } });
  const counts = { total: reports.length, approved: 0, submitted: 0, rejected: 0, draft: 0 };
  for (const r of reports) {
    if (r.status === "APPROVED") counts.approved++;
    else if (r.status === "SUBMITTED") counts.submitted++;
    else if (r.status === "REJECTED") counts.rejected++;
    else counts.draft++;
  }
  const cw = currentWeek();
  const have = new Set(reports.map((r) => `${r.year}-${r.week}`));
  const missing = expectedWeeks(me.ausbildungsbeginn).filter((w) => !have.has(`${w.year}-${w.week}`) && !(w.year === cw.year && w.week === cw.week));
  const current = reports.find((r) => r.year === cw.year && r.week === cw.week);
  const attention = reports.filter((r) => r.status === "REJECTED" || r.status === "DRAFT").slice(0, 5);

  // Streak: aufeinanderfolgende Wochen (rückwärts ab letzter Woche) mit eingereichtem/genehmigtem Bericht
  let streak = 0;
  const ok = new Set(reports.filter((r) => r.status !== "DRAFT" && r.status !== "REJECTED").map((r) => `${r.year}-${r.week}`));
  const all = expectedWeeks(me.ausbildungsbeginn).reverse();
  for (const w of all) { if (w.year === cw.year && w.week === cw.week) continue; if (ok.has(`${w.year}-${w.week}`)) streak++; else break; }

  const createCurrent = openOrCreateReport.bind(null, cw.year, cw.week);

  return (
    <>
      <PageHeader
        title={`Hallo ${me.firstName} 👋`}
        description={`${weekLabel(cw.year, cw.week)} · ${me.beruf ?? "Auszubildende/r"}${me.ausbildungsjahr ? ` · ${me.ausbildungsjahr}. Ausbildungsjahr` : ""}`}
        actions={
          current ? (
            <ButtonLink href={`/azubi/berichte/${current.id}${current.status === "DRAFT" || current.status === "REJECTED" ? "/bearbeiten" : ""}`}><FileEdit className="h-4 w-4" /> Aktuelle Woche öffnen</ButtonLink>
          ) : (
            <form action={createCurrent}><SubmitButton pendingText="Wird angelegt …"><FilePlus2 className="h-4 w-4" /> Bericht für diese Woche</SubmitButton></form>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Genehmigt" value={counts.approved} icon={CheckCircle2} tone="success" />
        <Stat label="In Prüfung" value={counts.submitted} icon={Clock} tone="brand" />
        <Stat label="Zurückgegeben / Entwurf" value={counts.rejected + counts.draft} icon={FileEdit} tone={counts.rejected ? "danger" : "neutral"} />
        <Stat label="Serie" value={`${streak} Wo.`} icon={Flame} tone="warning" hint="Wochen in Folge pünktlich eingereicht" />
      </div>

      {missing.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/60">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">{missing.length} Woche(n) ohne Bericht</p>
                <p className="text-sm text-amber-800">{missing.slice(-6).map((w) => weekLabel(w.year, w.week)).join(", ")}{missing.length > 6 ? " …" : ""}</p>
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
                    <div><p className="font-medium">{weekLabel(r.year, r.week)}</p><p className="text-xs text-slate-500">ab {fmtDate(r.weekStart)}</p></div>
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
                    <div><p className="font-medium">{weekLabel(r.year, r.week)}</p><p className="text-xs text-slate-500">geändert {fmtDate(r.updatedAt, "dd.MM.yyyy HH:mm")}</p></div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <CardBody className="text-sm text-slate-500">Noch keine Berichte. Leg jetzt deinen ersten Wochenbericht an.</CardBody>}
        </Card>
      </div>
    </>
  );
}
