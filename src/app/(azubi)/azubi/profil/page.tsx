import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PasswordForm } from "@/components/shell/password-form";
import { fmtDate } from "@/lib/dates";
import { fullName } from "@/lib/utils";

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ pw?: string }> }) {
  const me = await requireAzubi();
  const { pw } = await searchParams;
  const [trainer, rotations] = await Promise.all([
    me.trainerId ? db.user.findUnique({ where: { id: me.trainerId }, select: { firstName: true, lastName: true, email: true } }) : null,
    db.rotation.findMany({ where: { azubiId: me.id }, orderBy: { startDate: "asc" }, include: { department: { select: { name: true } } } }),
  ]);
  const rows: [string, React.ReactNode][] = [
    ["Name", fullName(me)], ["E-Mail", me.email], ["Ausbildungsberuf", me.beruf ?? "–"],
    ["Ausbildungszeitraum", `${fmtDate(me.ausbildungsbeginn)} – ${fmtDate(me.ausbildungsende)}`],
    ["Stammabteilung", me.department?.name ?? "–"],
    ["Ausbilder/in", trainer ? <>{fullName(trainer)} <span className="text-slate-400">· {trainer.email}</span></> : "–"],
  ];
  return (
    <>
      <PageHeader title="Profil" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Stammdaten" description="Änderungen bitte über Ausbilder/in oder Admin." />
            <dl className="divide-y divide-slate-100">
              {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[160px_1fr] px-5 py-3 text-sm"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Durchlaufplan" description="Deine Abteilungseinsätze" />
            {rotations.length ? (
              <ul className="divide-y divide-slate-100">
                {rotations.map((r) => {
                  const now = new Date(); const active = r.startDate <= now && r.endDate >= now;
                  return <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm"><span className="font-medium">{r.department.name}{active && <span className="ml-2 rounded-full bg-emerald-50 px-2 text-xs text-emerald-700">aktuell</span>}</span><span className="text-slate-500">{fmtDate(r.startDate)} – {fmtDate(r.endDate)}</span></li>;
                })}
              </ul>
            ) : <CardBody className="text-sm text-slate-500">Noch keine Einsätze geplant.</CardBody>}
          </Card>
        </div>
        <Card>
          <CardHeader title="Passwort ändern" />
          <CardBody><PasswordForm forced={pw === "1" || me.mustChangePassword} /></CardBody>
        </Card>
      </div>
    </>
  );
}
