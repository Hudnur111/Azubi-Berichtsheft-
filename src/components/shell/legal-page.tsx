import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { Brand } from "./auth-layout";

export async function LegalPage({ kind }: { kind: "impressum" | "datenschutz" }) {
  const s = await getSettings();
  const text = kind === "impressum" ? s.impressum : s.datenschutz;
  const title = kind === "impressum" ? "Impressum" : "Datenschutzerklärung";
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between"><Brand /><Link href="/login" className="text-sm text-brand-600 hover:underline">Zur Anmeldung</Link></div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {text ? (
        <div className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
      ) : (
        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Noch kein Text hinterlegt. Ein Administrator kann {title} unter <em>Einstellungen</em> im Ausbilder-Portal pflegen.</p>
      )}
      {kind === "datenschutz" && (
        <p className="mt-8 text-xs text-slate-500">Hinweis: Diese Anwendung speichert Berichte, Anhänge, Nachrichten und ein Audit-Log in der Datenbank des Betreibers. Es werden keine Tracking-Dienste eingesetzt. Sitzungen laufen über ein httpOnly-Cookie.</p>
      )}
    </main>
  );
}
