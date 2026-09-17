import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PasswordForm } from "@/components/shell/password-form";
import { QueryToast } from "@/components/ui/toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateOwnProfile } from "@/actions/auth";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { fullName } from "@/lib/utils";

export default async function AdminProfil({ searchParams }: { searchParams: Promise<{ pw?: string; ok?: string; error?: string }> }) {
  const me = await requireStaff();
  const { pw, ok, error } = await searchParams;
  return (
    <>
      <PageHeader title="Profil" />
      <QueryToast ok={ok} error={error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mein Account" />
          <dl className="divide-y divide-slate-100 text-sm">
            {([["Name", fullName(me)], ["Benutzername", me.username], ["E-Mail", me.email ?? "–"], ["Rolle", `${ROLE_LABELS[me.role]} – ${ROLE_DESCRIPTIONS[me.role]}`], ["Abteilung", me.department?.name ?? "–"]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] px-5 py-3"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <div className="space-y-6">
          <Card><CardHeader title="E-Mail-Adresse" description="Für Passwort-Zurücksetzen und E-Mail-Benachrichtigungen." /><CardBody><form action={updateOwnProfile} className="flex flex-wrap items-end gap-2"><div className="flex-1"><label className="label" htmlFor="email">E-Mail</label><input id="email" name="email" type="email" defaultValue={me.email ?? ""} className="input" /></div><SubmitButton variant="outline">Speichern</SubmitButton></form></CardBody></Card>
          <Card><CardHeader title="Passwort ändern" /><CardBody><PasswordForm forced={pw === "1" || me.mustChangePassword} /></CardBody></Card>
        </div>
      </div>
    </>
  );
}
