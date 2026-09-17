import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PasswordForm } from "@/components/shell/password-form";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { fullName } from "@/lib/utils";

export default async function AdminProfil({ searchParams }: { searchParams: Promise<{ pw?: string }> }) {
  const me = await requireStaff();
  const { pw } = await searchParams;
  return (
    <>
      <PageHeader title="Profil" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mein Account" />
          <dl className="divide-y divide-slate-100 text-sm">
            {([["Name", fullName(me)], ["E-Mail", me.email], ["Rolle", `${ROLE_LABELS[me.role]} – ${ROLE_DESCRIPTIONS[me.role]}`], ["Abteilung", me.department?.name ?? "–"]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] px-5 py-3"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <Card><CardHeader title="Passwort ändern" /><CardBody><PasswordForm forced={pw === "1" || me.mustChangePassword} /></CardBody></Card>
      </div>
    </>
  );
}
