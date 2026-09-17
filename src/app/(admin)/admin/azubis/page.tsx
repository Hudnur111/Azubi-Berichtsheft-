import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { azubiScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Empty } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { QueryToast } from "@/components/ui/toast";
import { ButtonLink } from "@/components/ui/button";
import { currentWeek, expectedWeeks, fmtDate } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function AzubisPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const azubis = await db.user.findMany({
    where: { ...azubiScope(me), ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { department: { select: { name: true } }, trainer: { select: { firstName: true, lastName: true } }, reports: { select: { year: true, week: true, status: true } } },
  });
  const cw = currentWeek();
  const rows = azubis.map((a) => {
    const have = new Set(a.reports.map((r) => `${r.year}-${r.week}`));
    const missing = expectedWeeks(a.ausbildungsbeginn).filter((w) => !have.has(`${w.year}-${w.week}`) && !(w.year === cw.year && w.week === cw.week)).length;
    const pending = a.reports.filter((r) => r.status === "SUBMITTED").length;
    const approved = a.reports.filter((r) => r.status === "APPROVED").length;
    return { ...a, missing, pending, approved };
  });
  return (
    <>
      <PageHeader title="Auszubildende" description={`${rows.length} Azubi(s) in deinem Zuständigkeitsbereich`} actions={me.role === "ADMIN" && <ButtonLink href="/admin/benutzer/neu?role=AZUBI">Azubi anlegen</ButtonLink>} />
      <QueryToast ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader title="Übersicht" action={<form method="get"><input name="q" defaultValue={q} placeholder="Suchen …" className="input w-56 py-1.5 text-xs" /></form>} />
        {rows.length ? (
          <Table>
            <thead><tr><Th>Name</Th><Th>Beruf / Jahr</Th><Th>Abteilung</Th><Th>Ausbilder/in</Th><Th>Berichte</Th><Th>Rückstand</Th><Th></Th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <Td><p className="font-medium text-slate-900">{fullName(a)}{!a.active && <Badge tone="danger" className="ml-2">inaktiv</Badge>}</p><p className="text-xs text-slate-500">{a.email}</p></Td>
                  <Td>{a.beruf ?? "–"}<br /><span className="text-xs text-slate-500">seit {fmtDate(a.ausbildungsbeginn)}</span></Td>
                  <Td>{a.department?.name ?? "–"}</Td>
                  <Td>{a.trainer ? fullName(a.trainer) : "–"}</Td>
                  <Td><span className="text-emerald-700">{a.approved} ✓</span>{a.pending > 0 && <Badge tone="brand" className="ml-2">{a.pending} offen</Badge>}</Td>
                  <Td>{a.missing ? <Badge tone={a.missing > 3 ? "danger" : "warning"}>{a.missing} Wo.</Badge> : <Badge tone="success">aktuell</Badge>}</Td>
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
