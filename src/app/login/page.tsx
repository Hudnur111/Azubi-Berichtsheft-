import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { portalMode } from "@/lib/utils";
import { AuthLayout } from "@/components/shell/auth-layout";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; portal?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "AZUBI" ? "/azubi" : "/admin");
  if (!(await db.user.count({ where: { role: "ADMIN" } }))) redirect("/setup");
  const mode = portalMode();
  const title = mode === "azubi" ? "Azubi-Portal" : mode === "admin" ? "Ausbilder-Portal" : "Anmelden";

  return (
    <AuthLayout title={title} subtitle="Mit Benutzername oder E-Mail anmelden.">
      {sp.ok && <Alert tone="success" className="mt-4">{sp.ok}</Alert>}
      {sp.error && <Alert tone="error" className="mt-4">{sp.error}</Alert>}
      {sp.portal && <Alert tone="info" className="mt-4">Dieses Deployment ist das {sp.portal === "azubi" ? "Azubi" : "Ausbilder"}-Portal. Für das andere Portal bitte die jeweilige Adresse verwenden.</Alert>}
      <LoginForm next={sp.next} mode={mode} />
      <div className="mt-6 space-y-2 text-center text-sm">
        {mode !== "admin" && <p><Link href="/registrieren" className="font-medium text-brand-600 hover:underline">Neu hier? Mit Einladungscode registrieren</Link></p>}
        <p><Link href="/passwort-vergessen" className="text-slate-500 hover:underline">Passwort vergessen?</Link></p>
      </div>
    </AuthLayout>
  );
}
