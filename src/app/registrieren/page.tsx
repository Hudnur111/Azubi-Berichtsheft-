import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { AuthLayout } from "@/components/shell/auth-layout";
import { fmtDate } from "@/lib/dates";
import { CodeForm, RegisterForm } from "./forms";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const invite = code && /^[A-Z0-9]{8}$/i.test(code)
    ? await db.user.findUnique({ where: { inviteCode: code.toUpperCase() }, select: { firstName: true, lastName: true, beruf: true, ausbildungsbeginn: true, passwordHash: true, trainer: { select: { firstName: true, lastName: true } }, department: { select: { name: true } } } })
    : null;
  const valid = invite && !invite.passwordHash;
  return (
    <AuthLayout
      title={valid ? `Willkommen, ${invite.firstName}!` : "Registrieren"}
      subtitle={valid ? "Dein Zugang wurde vorbereitet. Wähle jetzt Benutzername und Passwort." : "Gib den 8-stelligen Einladungscode ein, den du von deiner Ausbildung erhalten hast."}
      aside={
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">In drei Schritten startklar</h1>
          <ol className="space-y-3 text-brand-100">
            <li><span className="mr-2 rounded-full bg-white/20 px-2 py-0.5 text-sm font-semibold text-white">1</span> Einladungscode von Ausbilder/in erhalten</li>
            <li><span className="mr-2 rounded-full bg-white/20 px-2 py-0.5 text-sm font-semibold text-white">2</span> Code eingeben, Benutzername und Passwort wählen</li>
            <li><span className="mr-2 rounded-full bg-white/20 px-2 py-0.5 text-sm font-semibold text-white">3</span> Berichtstyp wählen und ersten Bericht schreiben</li>
          </ol>
        </div>
      }
    >
      {valid ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50 p-3 text-xs">
            <dt className="text-slate-500">Name</dt><dd className="font-medium">{invite.firstName} {invite.lastName}</dd>
            <dt className="text-slate-500">Ausbildung</dt><dd className="font-medium">{invite.beruf ?? "–"}</dd>
            <dt className="text-slate-500">Beginn</dt><dd className="font-medium">{fmtDate(invite.ausbildungsbeginn)}</dd>
            <dt className="text-slate-500">Ausbilder/in</dt><dd className="font-medium">{invite.trainer ? `${invite.trainer.firstName} ${invite.trainer.lastName}` : "–"}</dd>
            {invite.department && <><dt className="text-slate-500">Abteilung</dt><dd className="font-medium">{invite.department.name}</dd></>}
          </dl>
          <RegisterForm code={code!.toUpperCase()} />
        </>
      ) : (
        <CodeForm invalid={!!code && !valid} />
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-slate-500 hover:underline">Zurück zur Anmeldung</Link></p>
    </AuthLayout>
  );
}
