import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { holidayMap } from "@/lib/holidays";
import { getSettings } from "@/lib/settings";
import { azubiScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { QueryToast } from "@/components/ui/toast";
import { ButtonLink } from "@/components/ui/button";
import { fmtDate, missingUnits } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function AzubisPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const azubis = await db.user.findMany({
    where: { ...azubiScope(me), ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { department: { select: { name: true } }, trainer: { select: { firstName: true, lastName: true } }, reports: { select: { year: true, week: true, day: true, status: true } } },
  });
  const holidays = holidayMap([new Date().getFullYear() - 1, new Date().getFullYear()], (await getSettings()).bundesland);
  const rows = azubis.map((a) => {
    const missing = missingUnits(a.berichtsheftTyp, a.ausbildungsbeginn, a.reports, new Date(), holidays).length;
    const pending = a.reports.filter((r) => r.status === "SUBMITTED").length;
    const approved = a.reports.filter((r) => r.status === "APPROVED").length;
    return { ...a, missing, pending, approved };
  });
  return (
    <>
      <PageHeader title="Auszubildende" description={`${rows.length} Azubi(s) in deinem Zuständigkeitsbereich`} actions={(me.role === "ADMIN" || me.role === "AUSBILDER") && <ButtonLink href="/admin/benutzer/neu?role=AZUBI">Azubi anlegen</ButtonLink>} />
      <QueryToast ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader title="Übersicht" action={<form method="get"><input name="q" defaultValue={q} placeholder="Suchen …" className="input w-56 py-1.5 text-xs" /></form>} />
        {rows.length ? (
          <Table>
            <thead><tr><Th>Name</Th><Th>Beruf / Jahr</Th><Th>Abteilung</Th><Th>Ausbilder/in</Th><Th>Berichte</Th><Th>Rückstand</Th><Th></Th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td><p className="font-medium text-slate-900">{fullName(a)}{!a.active && <Badge tone="danger" className="ml-2">inaktiv</Badge>}{!a.passwordHash && <Badge tone="warning" className="ml-2">Einladung offen</Badge>}</p><p className="text-xs text-slate-500">{a.username}{a.email ? ` · ${a.email}` : ""}</p></Td>
                  <Td>{a.beruf ?? "–"}<br /><span className="text-xs text-slate-500">seit {fmtDate(a.ausbildungsbeginn)} · {a.berichtsheftTyp === "DAILY" ? "Tagesberichte" : a.berichtsheftTyp === "WEEKLY" ? "Wochenberichte" : "Typ offen"}</span></Td>
                  <Td>{a.department?.name ?? "–"}</Td>
                  <Td>{a.trainer ? fullName(a.trainer) : "–"}</Td>
                  <Td><span className="text-emerald-700">{a.approved} ✓</span>{a.pending > 0 && <Badge tone="brand" className="ml-2">{a.pending} offen</Badge>}</Td>
                  <Td>{a.missing ? <Badge tone={a.missing > 3 ? "danger" : "warning"}>{a.missing} {a.berichtsheftTyp === "DAILY" ? "Tage" : "Wo."}</Badge> : <Badge tone="success">aktuell</Badge>}</Td>
                  <Td className="text-right"><Link href={`/admin/azubis/${a.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Akte <ChevronRight className="h-4 w-4" /></Link></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Keine Auszubildenden" description={me.role === "ADMIN" ? "Lege unter Benutzer & Rollen Azubis an." : "Dir sind noch keine Azubis zugeordnet."} />}
      </Card>
    </>
  );
}
