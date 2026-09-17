import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { readFlash, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { azubiScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { Badge } from "@/components/ui/badge";
import { UserForm } from "@/components/admin/user-form";
import { InviteCodeBox } from "@/components/admin/invite-code";
import { deleteUser, regenerateInvite, resetPassword, updateUser } from "@/actions/admin";
import { fullName } from "@/lib/utils";
import { fmtDateTime } from "@/lib/dates";

export default async function BenutzerBearbeiten({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; created?: string; f?: string }> }) {
  const me = await requireRole("ADMIN", "AUSBILDER");
  const { id } = await params;
  const sp = await searchParams;
  const [user, departments, trainers, flash] = await Promise.all([
    db.user.findFirst({ where: { id, ...(me.role === "ADMIN" ? {} : azubiScope(me)) } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: { in: ["AUSBILDER", "ADMIN", "ABTEILUNGSLEITER"] }, active: true, NOT: { id } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
    readFlash(sp.f),
  ]);
  if (!user) notFound();
  const pw = flash?.startsWith("pw:") ? flash.slice(3) : null;
  const pending = !user.passwordHash;
  return (
    <>
      <PageHeader title={fullName(user)} description={<>Benutzername <code className="rounded bg-slate-100 px-1">{user.username}</code>{user.email && <> · {user.email}</>} · angelegt {fmtDateTime(user.createdAt)}{pending && <Badge tone="warning" className="ml-2">Einladung offen</Badge>}</>} actions={<ButtonLink href={me.role === "ADMIN" ? "/admin/benutzer" : "/admin/azubis"} variant="ghost"><ArrowLeft className="h-4 w-4" /> Zurück</ButtonLink>} />
      <QueryToast ok={sp.ok} error={sp.error} />
      {pw && (
        <Alert tone="success" className="mb-4">
          <p className="font-medium">{sp.created ? "Account angelegt." : "Passwort zurückgesetzt."} Bitte dem Nutzer sicher mitteilen – es wird nur einmal angezeigt:</p>
          <p className="mt-1 text-sm">Benutzername <code className="rounded bg-white px-2 py-0.5 font-mono">{user.username}</code> · Passwort <code className="rounded bg-white px-2 py-0.5 font-mono text-base tracking-wide">{pw}</code></p>
        </Alert>
      )}
      {pending && user.inviteCode && (
        <Card className="mb-6 border-brand-200 bg-brand-50/40">
          <CardHeader title={sp.created ? "Account angelegt – Einladungscode" : "Einladungscode"} description="Diesen Code dem Azubi geben. Registrierung unter /registrieren: Code eingeben, Benutzername und Passwort wählen." />
          <CardBody><InviteCodeBox code={user.inviteCode} /></CardBody>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card><CardBody><UserForm action={updateUser} user={user} departments={departments} trainers={trainers} adminOnlyRoles={me.role === "ADMIN"} /></CardBody></Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Zugang" />
            <CardBody className="space-y-3">
              {!pending && <ConfirmForm action={resetPassword} confirm={`Neues Passwort für ${fullName(user)} generieren?`} className="block"><input type="hidden" name="id" value={user.id} /><SubmitButton variant="outline" className="w-full"><KeyRound className="h-4 w-4" /> Passwort zurücksetzen</SubmitButton></ConfirmForm>}
              {user.role === "AZUBI" && <ConfirmForm action={regenerateInvite} confirm={pending ? "Neuen Einladungscode erzeugen? Der alte wird ungültig." : `Neuen Einladungscode erzeugen? ${fullName(user)} kann sich dann nicht mehr mit dem alten Passwort anmelden und registriert sich neu.`} className="block"><input type="hidden" name="id" value={user.id} /><SubmitButton variant="outline" className="w-full"><RefreshCw className="h-4 w-4" /> {pending ? "Code neu erzeugen" : "Neu einladen (Code)"}</SubmitButton></ConfirmForm>}
              {user.id !== me.id && me.role === "ADMIN" && (
                <ConfirmForm action={deleteUser} confirm={`${fullName(user)} endgültig löschen? Alle Berichte werden mit gelöscht!`} className="block"><input type="hidden" name="id" value={user.id} /><SubmitButton variant="danger" className="w-full"><Trash2 className="h-4 w-4" /> Account löschen</SubmitButton></ConfirmForm>
              )}
              <p className="text-xs text-slate-500">Tipp: Statt Löschen lieber deaktivieren – so bleiben Berichte erhalten.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
