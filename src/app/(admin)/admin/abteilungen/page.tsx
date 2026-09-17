import { Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { QueryToast } from "@/components/ui/toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { Empty } from "@/components/ui/empty";
import { deleteDepartment, saveDepartment } from "@/actions/admin";
import { fullName } from "@/lib/utils";

export default async function AbteilungenPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    include: { users: { where: { active: true }, select: { id: true, firstName: true, lastName: true, role: true } }, _count: { select: { reports: true } } },
  });
  const editing = sp.edit ? departments.find((d) => d.id === sp.edit) : undefined;
  return (
    <>
      <PageHeader title="Abteilungen" description="Struktur für Zuständigkeiten, Durchlaufplan und Auswertungen." />
      <QueryToast ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Alle Abteilungen" />
          {departments.length ? (
            <Table>
              <thead><tr><Th>Abteilung</Th><Th>Leitung / Ausbilder</Th><Th>Azubis</Th><Th>Berichte</Th><Th></Th></tr></thead>
              <tbody>
                {departments.map((d) => {
                  const staff = d.users.filter((u) => u.role !== "AZUBI");
                  const azubis = d.users.filter((u) => u.role === "AZUBI");
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <Td><p className="font-medium text-slate-900">{d.name} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{d.code}</span></p>{d.description && <p className="text-xs text-slate-500">{d.description}</p>}</Td>
                      <Td className="text-xs">{staff.length ? staff.map((u) => fullName(u)).join(", ") : <span className="text-slate-400">–</span>}</Td>
                      <Td>{azubis.length}</Td>
                      <Td>{d._count.reports}</Td>
                      <Td className="text-right whitespace-nowrap">
                        <a href={`/admin/abteilungen?edit=${d.id}`} className="text-sm font-medium text-brand-600 hover:underline">Bearbeiten</a>
                        <ConfirmForm action={deleteDepartment} confirm={`Abteilung „${d.name}“ löschen? Zuordnungen werden entfernt.`} className="ml-3 inline"><input type="hidden" name="id" value={d.id} /><button className="rounded p-1 text-slate-400 hover:text-red-600" title="Löschen"><Trash2 className="h-4 w-4" /></button></ConfirmForm>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : <Empty title="Noch keine Abteilungen" description="Lege rechts die erste Abteilung an." />}
        </Card>
        <Card>
          <CardHeader title={editing ? `„${editing.name}“ bearbeiten` : "Neue Abteilung"} action={editing && <a href="/admin/abteilungen" className="text-sm text-slate-500 hover:underline">Abbrechen</a>} />
          <CardBody>
            <form action={saveDepartment} key={editing?.id ?? "new"} className="space-y-3">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={editing?.name} required className="input" placeholder="z. B. Vertrieb" /></div>
              <div><label className="label" htmlFor="code">Kürzel</label><input id="code" name="code" defaultValue={editing?.code} required maxLength={12} className="input uppercase" placeholder="z. B. VTR" /></div>
              <div><label className="label" htmlFor="description">Beschreibung</label><textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={3} className="input" /></div>
              <SubmitButton className="w-full">{editing ? "Speichern" : "Anlegen"}</SubmitButton>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
