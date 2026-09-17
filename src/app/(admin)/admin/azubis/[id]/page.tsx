import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BellRing, ChevronRight, Pencil } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { azubiScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { QueryToast } from "@/components/ui/toast";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { remindAzubi } from "@/actions/admin";
import { currentWeek, expectedWeeks, fmtDate, weekLabel } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function AzubiAkte({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const azubi = await db.user.findFirst({
    where: { id, ...azubiScope(me) },
    include: {
      department: true, trainer: { select: { firstName: true, lastName: true, email: true } },
      reports: { orderBy: [{ year: "desc" }, { week: "desc" }], include: { department: { select: { name: true } } } },
      rotations: { orderBy: { startDate: "asc" }, include: { department: { select: { name: true } } } },
    },
  });
  if (!azubi) notFound();
  const cw = currentWeek();
  const have = new Set(azubi.reports.map((r) => `${r.year}-${r.week}`));
  const missing = expectedWeeks(azubi.ausbildungsbeginn).filter((w) => !have.has(`${w.year}-${w.week}`) && !(w.year === cw.year && w.week === cw.week)).reverse();
  const counts = { APPROVED: 0, SUBMITTED: 0, REJECTED: 0, DRAFT: 0 };
  for (const r of azubi.reports) counts[r.status]++;
  const hours = await db.reportEntry.aggregate({ where: { report: { azubiId: id, status: "APPROVED" } }, _sum: { hours: true } });

  return (
    <>
      <PageHeader
        title={fullName(azubi)}
        description={<>{azubi.beruf ?? "Auszubildende/r"} · {azubi.department?.name ?? "ohne Stammabteilung"} · Ausbilder/in: {azubi.trainer ? fullName(azubi.trainer) : "–"}{!azubi.active && <Badge tone="danger" className="ml-2">inaktiv</Badge>}</>}
        actions={
          <>
            <ButtonLink href="/admin/azubis" variant="ghost"><ArrowLeft className="h-4 w-4" /> Zurück</ButtonLink>
            {me.role === "ADMIN" && <ButtonLink href={`/admin/benutzer/${azubi.id}`} variant="outline"><Pencil className="h-4 w-4" /> Stammdaten</ButtonLink>}
            {missing.length > 0 && (
              <form action={remindAzubi}><input type="hidden" name="azubiId" value={azubi.id} /><input type="hidden" name="weeks" value={missing.slice(0, 5).map((w) => weekLabel(w.year, w.week)).join(", ")} /><SubmitButton variant="outline"><BellRing className="h-4 w-4" /> Erinnern</SubmitButton></form>
            )}
          </>
        }
      />
      <QueryToast ok={sp.ok} error={sp.error} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {([["Genehmigt", counts.APPROVED, "success"], ["In Prüfung", counts.SUBMITTED, "brand"], ["Zurückgegeben", counts.REJECTED, "danger"], ["Entwürfe", counts.DRAFT, "neutral"], ["Fehlende Wochen", missing.length, missing.length ? "warning" : "success"]] as const).map(([l, v, t]) => (
          <div key={l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{l}</p><p className="text-2xl font-semibold"><Badge tone={t} className="text-base">{v}</Badge></p></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Berichte" description={`${azubi.reports.length} gesamt · ${Number(hours._sum.hours ?? 0).toLocaleString("de-DE")} genehmigte Stunden`} />
          {azubi.reports.length ? (
            <Table>
              <thead><tr><Th>Woche</Th><Th>Zeitraum</Th><Th>Abteilung</Th><Th>Status</Th><Th></Th></tr></thead>
              <tbody>
                {azubi.reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <Td className="font-medium">{weekLabel(r.year, r.week)}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(r.weekStart)} – {fmtDate(r.weekEnd)}</Td>
                    <Td>{r.department?.name ?? "–"}</Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td className="text-right"><Link href={`/admin/berichte/${r.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Öffnen <ChevronRight className="h-4 w-4" /></Link></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <CardBody className="text-sm text-slate-500">Noch keine Berichte.</CardBody>}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Stammdaten" />
            <dl className="divide-y divide-slate-100 text-sm">
              {([["E-Mail", azubi.email], ["Ausbildung", `${fmtDate(azubi.ausbildungsbeginn)} – ${fmtDate(azubi.ausbildungsende)}`], ["Ausbildungsjahr", azubi.ausbildungsjahr ?? "–"], ["Letzter Login", fmtDate(azubi.lastLoginAt, "dd.MM.yyyy HH:mm")]] as [string, React.ReactNode][]).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] px-5 py-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium break-all">{v}</dd></div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Durchlaufplan" action={<Link href={`/admin/durchlaufplan?azubi=${azubi.id}`} className="text-sm text-brand-600 hover:underline">Bearbeiten</Link>} />
            {azubi.rotations.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {azubi.rotations.map((r) => <li key={r.id} className="flex justify-between px-5 py-2"><span className="font-medium">{r.department.name}</span><span className="text-slate-500">{fmtDate(r.startDate)} – {fmtDate(r.endDate)}</span></li>)}
              </ul>
            ) : <CardBody className="text-sm text-slate-500">Keine Einsätze geplant.</CardBody>}
          </Card>
          {missing.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader title="Fehlende Wochen" description={`${missing.length} ohne Bericht`} />
              <CardBody className="flex flex-wrap gap-1">{missing.slice(0, 20).map((w) => <Badge key={`${w.year}-${w.week}`} tone="warning">{weekLabel(w.year, w.week)}</Badge>)}{missing.length > 20 && <Badge>+{missing.length - 20}</Badge>}</CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
