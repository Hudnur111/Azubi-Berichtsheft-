import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/shell/auth-layout";
import { mailEnabled } from "@/lib/mail";
import { Alert } from "@/components/ui/alert";
import { ForgotForm } from "./form";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default async function ForgotPage() {
  const enabled = mailEnabled();
  return (
    <AuthLayout title="Passwort vergessen" subtitle="Wir senden dir einen Link zum Zurücksetzen an deine hinterlegte E-Mail-Adresse.">
      {enabled ? <ForgotForm /> : (
        <Alert tone="info" className="mt-6">Der E-Mail-Versand ist in dieser Installation nicht eingerichtet. Bitte wende dich an deine/n Ausbilder/in oder den Admin – dort kann ein neues Passwort vergeben werden.</Alert>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-slate-500 hover:underline">Zurück zur Anmeldung</Link></p>
    </AuthLayout>
  );
}
