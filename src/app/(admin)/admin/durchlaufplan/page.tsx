import { Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { azubiScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { QueryToast } from "@/components/ui/toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { SelectNav } from "@/components/ui/select-nav";
import { Badge } from "@/components/ui/badge";
import { Empty } from "@/components/ui/empty";
import { deleteRotation, saveRotation } from "@/actions/admin";
import { fmtDate } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function DurchlaufplanPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; azubi?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const canEdit = me.role === "ADMIN" || me.role === "AUSBILDER";
  const [azubis, departments, rotations] = await Promise.all([
    db.user.findMany({ where: { active: true, ...azubiScope(me) }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.rotation.findMany({ where: { azubi: azubiScope(me), ...(sp.azubi ? { azubiId: sp.azubi } : {}) }, orderBy: [{ startDate: "desc" }], include: { azubi: { select: { firstName: true, lastName: true } }, department: { select: { name: true, code: true } } } }),
  ]);
  const now = new Date();
  return (
    <>
      <PageHeader title="Durchlaufplan" description="Abteilungseinsätze der Azubis. Berichte werden automatisch der aktuellen Abteilung zugeordnet." />
      <QueryToast ok={sp.ok} error={sp.error} />
      <div className={`grid gap-6 ${canEdit ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <Card>
          <CardHeader title="Einsätze" action={<SelectNav value={sp.azubi ?? ""} placeholder="Alle Azubis" options={azubis.map((a) => ({ value: a.id, label: fullName(a) }))} param="azubi" basePath="/admin/durchlaufplan" />} />
          {rotations.length ? (
            <Table>
              <thead><tr><Th>Azubi</Th><Th>Abteilung</Th><Th>Zeitraum</Th><Th>Notiz</Th>{canEdit && <Th></Th>}</tr></thead>
              <tbody>
                {rotations.map((r) => {
                  const state = r.endDate < now ? "past" : r.startDate > now ? "future" : "active";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <Td className="font-medium text-slate-900">{fullName(r.azubi)}</Td>
                      <Td>{r.department.name} <span className="text-xs text-slate-400">{r.department.code}</span></Td>
                      <Td className="whitespace-nowrap">{fmtDate(r.startDate)} – {fmtDate(r.endDate)} {state === "active" && <Badge tone="success" className="ml-1">aktuell</Badge>}{state === "future" && <Badge tone="info" className="ml-1">geplant</Badge>}</Td>
                      <Td className="text-xs text-slate-500">{r.note ?? "–"}</Td>
                      {canEdit && <Td className="text-right"><ConfirmForm action={deleteRotation} confirm="Einsatz löschen?"><input type="hidden" name="id" value={r.id} /><button className="rounded p-1 text-slate-400 hover:text-red-600" title="Löschen"><Trash2 className="h-4 w-4" /></button></ConfirmForm></Td>}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : <Empty title="Keine Einsätze" description="Plane rechts den ersten Abteilungseinsatz." />}
        </Card>
        {canEdit && (
          <Card>
            <CardHeader title="Einsatz planen" />
            <CardBody>
              <form action={saveRotation} className="space-y-3">
                <div><label className="label" htmlFor="azubiId">Azubi</label><select id="azubiId" name="azubiId" defaultValue={sp.azubi ?? ""} required className="input"><option value="">– wählen –</option>{azubis.map((a) => <option key={a.id} value={a.id}>{fullName(a)}</option>)}</select></div>
                <div><label className="label" htmlFor="departmentId">Abteilung</label><select id="departmentId" name="departmentId" required className="input"><option value="">– wählen –</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label" htmlFor="startDate">Von</label><input id="startDate" name="startDate" type="date" required className="input" /></div>
                  <div><label className="label" htmlFor="endDate">Bis</label><input id="endDate" name="endDate" type="date" required className="input" /></div>
                </div>
                <div><label className="label" htmlFor="note">Notiz</label><input id="note" name="note" maxLength={300} className="input" placeholder="optional" /></div>
                <SubmitButton className="w-full">Einsatz speichern</SubmitButton>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
