import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/toast";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { UserForm } from "@/components/admin/user-form";
import { deleteUser, resetPassword, updateUser } from "@/actions/admin";
import { fullName } from "@/lib/utils";
import { fmtDateTime } from "@/lib/dates";

export default async function BenutzerBearbeiten({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; pw?: string; created?: string }> }) {
  const me = await requireRole("ADMIN");
  const { id } = await params;
  const sp = await searchParams;
  const [user, departments, trainers] = await Promise.all([
    db.user.findUnique({ where: { id } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: { in: ["AUSBILDER", "ADMIN", "ABTEILUNGSLEITER"] }, active: true, NOT: { id } }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  if (!user) notFound();
  return (
    <>
      <PageHeader title={fullName(user)} description={<>{user.email} · angelegt {fmtDateTime(user.createdAt)}</>} actions={<ButtonLink href="/admin/benutzer" variant="ghost"><ArrowLeft className="h-4 w-4" /> Zurück</ButtonLink>} />
      <QueryToast ok={sp.ok} error={sp.error} />
      {sp.pw && (
        <Alert tone="success" className="mb-4">
          <p className="font-medium">{sp.created ? "Account angelegt." : "Passwort zurückgesetzt."} Bitte dem Nutzer sicher mitteilen – es wird nur einmal angezeigt:</p>
          <code className="mt-1 inline-block rounded bg-white px-2 py-1 font-mono text-base tracking-wide">{sp.pw}</code>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card><CardBody><UserForm action={updateUser} user={user} departments={departments} trainers={trainers} /></CardBody></Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Zugang" />
            <CardBody className="space-y-3">
              <ConfirmForm action={resetPassword} confirm={`Neues Passwort für ${fullName(user)} generieren?`} className="block"><input type="hidden" name="id" value={user.id} /><SubmitButton variant="outline" className="w-full"><KeyRound className="h-4 w-4" /> Passwort zurücksetzen</SubmitButton></ConfirmForm>
              {user.id !== me.id && (
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
