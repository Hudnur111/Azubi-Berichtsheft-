import { redirect } from "next/navigation";
import { CalendarDays, CalendarRange, Check } from "lucide-react";
import { requireAzubi } from "@/lib/auth";
import { chooseReportType } from "@/actions/reports";
import { logoutAction } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata = { title: "Berichtstyp wählen" };

export default async function StartPage() {
  const me = await requireAzubi();
  if (me.berichtsheftTyp) redirect("/azubi");
  const options = [
    { type: "WEEKLY", icon: CalendarRange, title: "Wochenbericht", text: "Ein Bericht pro Kalenderwoche mit Einträgen für Montag bis Freitag. Der Klassiker – wenig Aufwand, gute Übersicht.", points: ["1 Bericht pro Woche", "5 Tageseinträge in einem Formular", "Einreichen am Wochenende oder Freitag"] },
    { type: "DAILY", icon: CalendarDays, title: "Tagesbericht", text: "Ein eigener Bericht für jeden Arbeitstag. Ideal, wenn detailliert dokumentiert werden soll oder die Ausbildungsordnung Tagesnachweise verlangt.", points: ["1 Bericht pro Werktag", "Kurz und aktuell – direkt nach Feierabend", "Einzeln einreichen und prüfen lassen"] },
  ] as const;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-brand-600">Willkommen, {me.firstName}!</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Wie möchtest du dein Berichtsheft führen?</h1>
          <p className="mt-2 text-slate-500">Die Wahl gilt für neue Berichte und kann später im Profil geändert werden.</p>
        </div>
        <form action={chooseReportType} className="grid gap-4 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o.type} className="group relative cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-400 has-[:checked]:border-brand-600 has-[:checked]:ring-2 has-[:checked]:ring-brand-100">
              <input type="radio" name="type" value={o.type} required defaultChecked={o.type === "WEEKLY"} className="peer sr-only" />
              <span className="absolute right-4 top-4 hidden h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white peer-checked:flex"><Check className="h-4 w-4" /></span>
              <o.icon className="h-8 w-8 text-brand-600" />
              <p className="mt-3 text-lg font-semibold text-slate-900">{o.title}</p>
              <p className="mt-1 text-sm text-slate-600">{o.text}</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-500">{o.points.map((p) => <li key={p} className="flex gap-2"><span className="text-brand-500">•</span>{p}</li>)}</ul>
            </label>
          ))}
          <div className="sm:col-span-2 flex justify-center"><SubmitButton size="lg" pendingText="Speichern …">Auswahl speichern und loslegen</SubmitButton></div>
        </form>
        <form action={logoutAction} className="mt-6 text-center"><button className="text-sm text-slate-500 hover:underline" title="Abmelden">Abmelden</button></form>
      </div>
    </main>
  );
}
