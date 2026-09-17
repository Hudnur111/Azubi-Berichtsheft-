import type { Department, Role, User } from "@prisma/client";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { fullName } from "@/lib/utils";

const ROLES: Role[] = ["AZUBI", "AUSBILDER", "ABTEILUNGSLEITER", "ADMIN"];
const d = (v: Date | null | undefined) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export function UserForm({ action, user, departments, trainers, defaultRole }: {
  action: (fd: FormData) => Promise<void>; user?: User; departments: Department[]; trainers: Pick<User, "id" | "firstName" | "lastName">[]; defaultRole?: Role;
}) {
  const role = user?.role ?? defaultRole ?? "AZUBI";
  return (
    <form action={action} className="space-y-5">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="firstName">Vorname</label><input id="firstName" name="firstName" defaultValue={user?.firstName} required className="input" /></div>
        <div><label className="label" htmlFor="lastName">Nachname</label><input id="lastName" name="lastName" defaultValue={user?.lastName} required className="input" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="email">E-Mail (Login)</label><input id="email" name="email" type="email" defaultValue={user?.email} required className="input" /></div>
        <div>
          <label className="label" htmlFor="role">Rolle</label>
          <select id="role" name="role" defaultValue={role} className="input">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
          <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{ROLES.map((r) => <li key={r}><span className="font-medium text-slate-600">{ROLE_LABELS[r]}:</span> {ROLE_DESCRIPTIONS[r]}</li>)}</ul>
        </div>
        <div>
          <label className="label" htmlFor="departmentId">Abteilung</label>
          <select id="departmentId" name="departmentId" defaultValue={user?.departmentId ?? ""} className="input"><option value="">– keine –</option>{departments.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.code})</option>)}</select>
          <p className="mt-1 text-xs text-slate-500">Bei Azubis: Stammabteilung. Bei Ausbildern/Leitungen: Zuständigkeitsbereich.</p>
        </div>
      </div>
      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Nur für Auszubildende</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="trainerId">Zuständige/r Ausbilder/in</label><select id="trainerId" name="trainerId" defaultValue={user?.trainerId ?? ""} className="input"><option value="">– keine/r –</option>{trainers.map((t) => <option key={t.id} value={t.id}>{fullName(t)}</option>)}</select></div>
          <div><label className="label" htmlFor="beruf">Ausbildungsberuf</label><input id="beruf" name="beruf" defaultValue={user?.beruf ?? ""} className="input" placeholder="z. B. Kaufmann/-frau für Büromanagement" /></div>
          <div><label className="label" htmlFor="ausbildungsbeginn">Ausbildungsbeginn</label><input id="ausbildungsbeginn" name="ausbildungsbeginn" type="date" defaultValue={d(user?.ausbildungsbeginn)} className="input" /></div>
          <div><label className="label" htmlFor="ausbildungsende">Voraussichtliches Ende</label><input id="ausbildungsende" name="ausbildungsende" type="date" defaultValue={d(user?.ausbildungsende)} className="input" /></div>
        </div>
      </fieldset>
      {user ? (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={user.active} className="h-4 w-4 rounded border-slate-300" /> Account aktiv</label>
      ) : (
        <div><label className="label" htmlFor="password">Startpasswort (optional)</label><input id="password" name="password" type="text" minLength={8} className="input" placeholder="Leer lassen → wird automatisch generiert" /><p className="mt-1 text-xs text-slate-500">Der Nutzer muss das Passwort beim ersten Login ändern.</p></div>
      )}
      <SubmitButton pendingText="Speichern …">{user ? "Änderungen speichern" : "Account anlegen"}</SubmitButton>
    </form>
  );
}
