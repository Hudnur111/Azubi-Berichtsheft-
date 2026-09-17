import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import type { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QueryToast } from "@/components/ui/toast";
import { ButtonLink } from "@/components/ui/button";
import { SelectNav } from "@/components/ui/select-nav";
import { fmtDate } from "@/lib/dates";
import { fullName } from "@/lib/utils";

const roleTone: Record<Role, "brand" | "info" | "success" | "neutral"> = { ADMIN: "brand", AUSBILDER: "info", ABTEILUNGSLEITER: "success", AZUBI: "neutral" };

export default async function BenutzerPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; role?: string; q?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const role = sp.role && sp.role in ROLE_LABELS ? (sp.role as Role) : undefined;
  const q = sp.q?.trim();
  const users = await db.user.findMany({
    where: { ...(role ? { role } : {}), ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
    include: { department: { select: { name: true } }, _count: { select: { azubis: true } } },
  });
  return (
    <>
      <PageHeader title="Benutzer & Rollen" description={`${users.length} Account(s)`} actions={<ButtonLink href="/admin/benutzer/neu"><UserPlus className="h-4 w-4" /> Neuer Account</ButtonLink>} />
      <QueryToast ok={sp.ok} error={sp.error} />
      <Card>
        <CardHeader title="Accounts" action={<div className="flex gap-2"><SelectNav value={role ?? ""} placeholder="Alle Rollen" options={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))} param="role" basePath="/admin/benutzer" /><form method="get"><input name="q" defaultValue={q} placeholder="Suchen …" className="input w-48 py-1.5 text-xs" /></form></div>} />
        <Table>
          <thead><tr><Th>Name</Th><Th>Rolle</Th><Th>Abteilung</Th><Th>Status</Th><Th>Letzter Login</Th><Th></Th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <Td><p className="font-medium text-slate-900">{fullName(u)}</p><p className="text-xs text-slate-500">{u.email}</p></Td>
                <Td><Badge tone={roleTone[u.role]}>{ROLE_LABELS[u.role]}</Badge>{u._count.azubis > 0 && <span className="ml-2 text-xs text-slate-400">{u._count.azubis} Azubi(s)</span>}</Td>
                <Td>{u.department?.name ?? "–"}</Td>
                <Td>{u.active ? <Badge tone="success">aktiv</Badge> : <Badge tone="danger">inaktiv</Badge>}{u.mustChangePassword && <Badge tone="warning" className="ml-1">PW ändern</Badge>}</Td>
                <Td className="text-xs text-slate-500">{fmtDate(u.lastLoginAt, "dd.MM.yyyy HH:mm")}</Td>
                <Td className="text-right"><Link href={`/admin/benutzer/${u.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Bearbeiten <ChevronRight className="h-4 w-4" /></Link></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
