import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import type { ReportStatus } from "@prisma/client";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { azubiScope, reportScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Empty } from "@/components/ui/empty";
import { StatusBadge } from "@/components/ui/status-badge";
import { SelectNav } from "@/components/ui/select-nav";
import { ButtonLink } from "@/components/ui/button";
import { fmtDate, fmtDateTime, weekLabel } from "@/lib/dates";
import { STATUS_LABELS } from "@/lib/labels";
import { fullName } from "@/lib/utils";

const STATUSES = Object.keys(STATUS_LABELS) as ReportStatus[];
const PAGE = 50;

export default async function AlleBerichte({ searchParams }: { searchParams: Promise<{ status?: string; azubi?: string; dept?: string; page?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ReportStatus) ? (sp.status as ReportStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...reportScope(me), ...(status ? { status } : {}), ...(sp.azubi ? { azubiId: sp.azubi } : {}), ...(sp.dept ? { departmentId: sp.dept } : {}) };
  const [reports, total, azubis, departments] = await Promise.all([
    db.report.findMany({ where, orderBy: [{ year: "desc" }, { week: "desc" }], skip: (page - 1) * PAGE, take: PAGE, include: { azubi: { select: { firstName: true, lastName: true } }, department: { select: { name: true } }, reviewer: { select: { firstName: true, lastName: true } } } }),
    db.report.count({ where }),
    db.user.findMany({ where: azubiScope(me), orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ]);
  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { status: sp.status, azubi: sp.azubi, dept: sp.dept, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return `/admin/berichte${s ? `?${s}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const keep = { status: sp.status, azubi: sp.azubi, dept: sp.dept };

  return (
    <>
      <PageHeader title="Alle Berichte" description={`${total} Bericht(e)`} actions={<ButtonLink href={`/admin/export${href({}).replace("/admin/berichte", "")}`} variant="outline"><Download className="h-4 w-4" /> CSV-Export</ButtonLink>} />
      <Card>
        <CardHeader
          title="Filter"
          action={
            <div className="flex flex-wrap gap-2">
              <SelectNav value={sp.status ?? ""} placeholder="Alle Status" options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} param="status" basePath="/admin/berichte" keep={keep} />
              <SelectNav value={sp.azubi ?? ""} placeholder="Alle Azubis" options={azubis.map((a) => ({ value: a.id, label: fullName(a) }))} param="azubi" basePath="/admin/berichte" keep={keep} />
              <SelectNav value={sp.dept ?? ""} placeholder="Alle Abteilungen" options={departments.map((d) => ({ value: d.id, label: d.name }))} param="dept" basePath="/admin/berichte" keep={keep} />
            </div>
          }
        />
        {reports.length ? (
          <Table>
            <thead><tr><Th>Azubi</Th><Th>Woche</Th><Th>Abteilung</Th><Th>Status</Th><Th>Geprüft</Th><Th></Th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td className="font-medium text-slate-900">{fullName(r.azubi)}</Td>
                  <Td className="whitespace-nowrap">{weekLabel(r.year, r.week)} <span className="text-xs text-slate-500">({fmtDate(r.weekStart)})</span></Td>
                  <Td>{r.department?.name ?? "–"}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td className="text-xs text-slate-500">{r.reviewer ? `${fullName(r.reviewer)} · ${fmtDateTime(r.reviewedAt)}` : "–"}</Td>
                  <Td className="text-right"><Link href={`/admin/berichte/${r.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Öffnen <ChevronRight className="h-4 w-4" /></Link></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <Empty title="Keine Berichte gefunden" />}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
            <span className="text-slate-500">Seite {page} von {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={`${href({})}${href({}).includes("?") ? "&" : "?"}page=${page - 1}`} className="text-brand-600 hover:underline">Zurück</Link>}
              {page < pages && <Link href={`${href({})}${href({}).includes("?") ? "&" : "?"}page=${page + 1}`} className="text-brand-600 hover:underline">Weiter</Link>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
