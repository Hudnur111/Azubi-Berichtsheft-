import type { Department, Role, User } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { fullName } from "@/lib/utils";

const ROLES: Role[] = ["AZUBI", "AUSBILDER", "ABTEILUNGSLEITER", "ADMIN"];
const d = (v: Date | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export function UserForm({ action, user, departments, trainers, defaultRole, adminOnlyRoles }: {
  action: (fd: FormData) => Promise<void>; user?: User; departments: Department[]; trainers: Pick<User, "id" | "firstName" | "lastName">[]; defaultRole?: Role; adminOnlyRoles?: boolean;
}) {
  const role = user?.role ?? defaultRole ?? "AZUBI";
  const roles = adminOnlyRoles ? ROLES : (["AZUBI"] as Role[]);
  return (
    <form action={action} className="space-y-5">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="firstName">Vorname</label><input id="firstName" name="firstName" defaultValue={user?.firstName} required className="input" /></div>
        <div><label className="label" htmlFor="lastName">Nachname</label><input id="lastName" name="lastName" defaultValue={user?.lastName} required className="input" /></div>
        <div><label className="label" htmlFor="username">Benutzername</label><input id="username" name="username" defaultValue={user?.username ?? ""} minLength={3} maxLength={32} pattern="[a-zA-Z0-9._\-]+" className="input" placeholder={user ? "" : "leer = automatisch (vorname.nachname)"} autoCapitalize="none" /><p className="mt-1 text-xs text-slate-500">Je Portal eindeutig (Azubi / Ausbildung).</p></div>
        <div><label className="label" htmlFor="email">E-Mail (optional)</label><input id="email" name="email" type="email" defaultValue={user?.email ?? ""} className="input" /><p className="mt-1 text-xs text-slate-500">Für Passwort-Zurücksetzen und E-Mail-Benachrichtigungen.</p></div>
        <div>
          <label className="label" htmlFor="role">Rolle</label>
          <select id="role" name="role" defaultValue={role} className="input">{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
          <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{roles.map((r) => <li key={r}><span className="font-medium text-slate-600">{ROLE_LABELS[r]}:</span> {ROLE_DESCRIPTIONS[r]}</li>)}</ul>
        </div>
        <div>
          <label className="label" htmlFor="departmentId">Abteilung</label>
          <select id="departmentId" name="departmentId" defaultValue={user?.departmentId ?? ""} className="input"><option value="">– keine –</option>{departments.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}</select>
          <p className="mt-1 text-xs text-slate-500">Bei Azubis: Stammabteilung. Bei Ausbildern/Leitungen: Zuständigkeitsbereich.</p>
        </div>
      </div>
      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Ausbildung (nur für Azubis)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="trainerId">Zuständige/r Ausbilder/in</label><select id="trainerId" name="trainerId" defaultValue={user?.trainerId ?? ""} className="input"><option value="">– keine/r –</option>{trainers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}</select></div>
          <div><label className="label" htmlFor="beruf">Ausbildungsberuf</label><input id="beruf" name="beruf" defaultValue={user?.beruf ?? ""} className="input" placeholder="z. B. Kaufmann/-frau für Büromanagement" list="berufe" /></div>
          <div><label className="label" htmlFor="ausbildungsbeginn">Ausbildungsbeginn</label><input id="ausbildungsbeginn" name="ausbildungsbeginn" type="date" defaultValue={d(user?.ausbildungsbeginn)} className="input" /></div>
          <div><label className="label" htmlFor="ausbildungsende">Voraussichtliches Ende</label><input id="ausbildungsende" name="ausbildungsende" type="date" defaultValue={d(user?.ausbildungsende)} className="input" /></div>
        </div>
        <datalist id="berufe">
          {["Fachinformatiker/in Anwendungsentwicklung", "Fachinformatiker/in Systemintegration", "Kaufmann/-frau für Büromanagement", "Kaufmann/-frau im Einzelhandel", "Kaufmann/-frau im Groß- und Außenhandelsmanagement", "Industriekaufmann/-frau", "Kaufmann/-frau für Digitalisierungsmanagement", "Kaufmann/-frau für Marketingkommunikation", "Medienkaufmann/-frau Digital und Print", "Mediengestalter/in Digital und Print", "Fachkraft für Lagerlogistik", "Elektroniker/in", "Industriemechaniker/in", "Mechatroniker/in", "Steuerfachangestellte/r", "Verlagskaufmann/-frau"].map((b) => <option key={b} value={b} />)}
        </datalist>
      </fieldset>
      {user ? (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={user.active} className="h-4 w-4 rounded border-slate-300" /> Account aktiv</label>
      ) : (
        <fieldset className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">Zugang</legend>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm"><input type="radio" name="accessMode" value="invite" defaultChecked={role === "AZUBI"} className="mt-0.5 h-4 w-4" /><span><span className="font-medium">Einladungscode</span> (empfohlen für Azubis) – der Azubi registriert sich selbst mit einem 8-stelligen Code und wählt Benutzername und Passwort.</span></label>
            <label className="flex items-start gap-2 text-sm"><input type="radio" name="accessMode" value="password" defaultChecked={role !== "AZUBI"} className="mt-0.5 h-4 w-4" /><span><span className="font-medium">Startpasswort</span> – wird angezeigt oder unten festgelegt; Wechsel beim ersten Login ist Pflicht.</span></label>
            <div><label className="label" htmlFor="password">Startpasswort (optional)</label><input id="password" name="password" type="text" minLength={8} className="input" placeholder="Leer lassen → wird automatisch generiert" /></div>
          </div>
        </fieldset>
      )}
      <SubmitButton pendingText="Speichern …">{user ? "Änderungen speichern" : "Account anlegen"}</SubmitButton>
    </form>
  );
}
