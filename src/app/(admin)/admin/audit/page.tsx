import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/dates";
import { fullName } from "@/lib/utils";

const tone = (a: string) => (a.includes("REJECT") || a.includes("DELETE") || a.includes("FAILED") ? "danger" : a.includes("APPROVE") || a.includes("CREATED") ? "success" : "neutral");

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireRole("ADMIN");
  const { page: p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const PAGE = 100;
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { actor: { select: { firstName: true, lastName: true } } } }),
    db.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <>
      <PageHeader title="Audit-Log" description={`${total} Ereignisse · revisionssichere Nachverfolgung aller Aktionen`} />
      <Card>
        <CardHeader title={`Seite ${page} / ${pages}`} action={<div className="flex gap-3 text-sm">{page > 1 && <a href={`/admin/audit?page=${page - 1}`} className="text-brand-600 hover:underline">Neuer</a>}{page < pages && <a href={`/admin/audit?page=${page + 1}`} className="text-brand-600 hover:underline">Älter</a>}</div>} />
        <Table>
          <thead><tr><Th>Zeit</Th><Th>Akteur</Th><Th>Aktion</Th><Th>Ziel</Th><Th>Details</Th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <Td className="whitespace-nowrap text-xs">{fmtDateTime(l.createdAt)}</Td>
                <Td>{l.actor ? fullName(l.actor) : <span className="text-slate-400">System</span>}</Td>
                <Td><Badge tone={tone(l.action)}>{l.action}</Badge></Td>
                <Td className="text-xs">{l.targetType}{l.targetId && <span className="text-slate-400"> · {l.targetId.slice(0, 8)}…</span>}</Td>
                <Td className="max-w-md truncate font-mono text-xs text-slate-500">{l.details ? JSON.stringify(l.details) : ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
