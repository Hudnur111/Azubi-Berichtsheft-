import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpenCheck, ShieldCheck, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { portalMode } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; portal?: string }> }) {
  const { next, portal } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "AZUBI" ? "/azubi" : "/admin");
  const mode = portalMode();
  const title = mode === "azubi" ? "Azubi-Portal" : mode === "admin" ? "Ausbilder-Portal" : "Berichtsheft";

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><BookOpenCheck className="h-6 w-6" /></div>
          <span className="text-lg font-semibold">Azubi-Berichtsheft</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight">Ausbildungsnachweise digital.<br />Schreiben, einreichen, prüfen.</h1>
          <ul className="space-y-3 text-brand-100">
            <li className="flex items-start gap-3"><BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0" /> Wochenberichte mit Tageseinträgen, Textbausteinen &amp; Autosave</li>
            <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /> Prüfworkflow: Einreichen → Freigabe oder Rückfrage mit Kommentar</li>
            <li className="flex items-start gap-3"><Users className="mt-0.5 h-5 w-5 shrink-0" /> Rollen für Admin, Ausbilder/innen, Abteilungsleitungen und Azubis</li>
          </ul>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} Berichtsheft · Gemäß § 13 BBiG Ausbildungsnachweis</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><BookOpenCheck className="h-6 w-6" /></div>
            <span className="text-lg font-semibold">Azubi-Berichtsheft</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">Bitte mit deinen Zugangsdaten anmelden.</p>
          {portal && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Dieses Deployment ist das {portal === "azubi" ? "Azubi" : "Admin"}-Portal. Für das andere Portal bitte die jeweilige URL verwenden.
            </p>
          )}
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
