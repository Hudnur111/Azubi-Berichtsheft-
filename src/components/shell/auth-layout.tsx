import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { getSettings } from "@/lib/settings";

export async function Brand({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = await getSettings();
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      {s.hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/branding/logo?v=${s.logoVersion}`} alt={s.companyName} className={`${box} rounded-xl object-contain`} />
      ) : (
        <span className={`flex ${box} items-center justify-center rounded-xl bg-brand-600 text-white`}><BookOpenCheck className="h-[55%] w-[55%]" /></span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{s.companyName}</span>
        <span className="block text-xs text-slate-500">Berichtsheft</span>
      </span>
    </span>
  );
}

/** Rahmen für öffentliche Seiten (Login, Registrierung, Passwort, Setup). */
export async function AuthLayout({ title, subtitle, children, aside }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  const s = await getSettings();
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          {s.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/branding/logo?v=${s.logoVersion}`} alt={s.companyName} className="h-12 w-12 rounded-xl bg-white/90 object-contain p-1" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><BookOpenCheck className="h-6 w-6" /></div>
          )}
          <span className="text-lg font-semibold">{s.companyName}</span>
        </div>
        {aside ?? (
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight">Ausbildungsnachweise digital.<br />Schreiben, einreichen, prüfen.</h1>
            <ul className="space-y-2 text-brand-100">
              <li>• Wochen- oder Tagesberichte mit Autosave und Textbausteinen</li>
              <li>• Prüfworkflow: Einreichen → Freigabe oder Rückfrage</li>
              <li>• Chat, Kalender, Anhänge, PDF-Export, Erinnerungen</li>
            </ul>
          </div>
        )}
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} {s.companyName} · Ausbildungsnachweis gemäß § 13 BBiG · <Link href="/impressum" className="underline">Impressum</Link> · <Link href="/datenschutz" className="underline">Datenschutz</Link></p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          {children}
          <p className="mt-8 text-center text-xs text-slate-400 lg:hidden"><Link href="/impressum" className="underline">Impressum</Link> · <Link href="/datenschutz" className="underline">Datenschutz</Link></p>
        </div>
      </section>
    </main>
  );
}
