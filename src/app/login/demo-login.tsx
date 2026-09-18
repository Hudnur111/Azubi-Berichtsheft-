import { ChevronDown, GraduationCap, Users } from "lucide-react";
import { demoLoginAction } from "@/actions/auth";
import { DEMO_ACCOUNTS, DEMO_INVITE_CODE, type DemoAccount } from "@/lib/demo-data";
import { DEMO_PASSWORD } from "@/lib/demo-mode";
import { ROLE_LABELS } from "@/lib/permissions";
import { SubmitButton } from "@/components/ui/submit-button";
import { initials } from "@/lib/utils";
import { LoginForm } from "./login-form";

const roleTone: Record<DemoAccount["role"], string> = {
  ADMIN: "bg-brand-100 text-brand-700",
  AUSBILDER: "bg-sky-100 text-sky-700",
  ABTEILUNGSLEITER: "bg-emerald-100 text-emerald-700",
  AZUBI: "bg-amber-100 text-amber-700",
};

function AccountButton({ account, next }: { account: DemoAccount; next?: string }) {
  const [firstName, lastName] = account.name.split(" ");
  return (
    <form action={demoLoginAction}>
      <input type="hidden" name="userId" value={account.id} />
      {next && <input type="hidden" name="next" value={next} />}
      <SubmitButton variant="outline" className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-left whitespace-normal" pendingText="Anmelden …">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${roleTone[account.role]}`}>{initials({ firstName, lastName })}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-slate-900">{account.name} <span className="font-normal text-slate-500">· {ROLE_LABELS[account.role]}</span></span>
          <span className="block text-xs font-normal text-slate-500">{account.hint}</span>
        </span>
      </SubmitButton>
    </form>
  );
}

/** Login-Bereich im Demo-Modus: Konto anklicken → sofort drin. */
export function DemoLogin({ next, mode }: { next?: string; mode: "azubi" | "admin" | "both" }) {
  const staff = DEMO_ACCOUNTS.filter((a) => a.group === "STAFF");
  const azubis = DEMO_ACCOUNTS.filter((a) => a.group === "AZUBI");
  const groups = [
    ...(mode !== "azubi" ? [{ key: "STAFF", label: "Ausbildung", icon: Users, accounts: staff }] : []),
    ...(mode !== "admin" ? [{ key: "AZUBI", label: "Azubi", icon: GraduationCap, accounts: azubis }] : []),
  ];
  return (
    <div className="mt-6 space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><g.icon className="h-4 w-4" /> {g.label}</h3>
          <div className="space-y-2">{g.accounts.map((a) => <AccountButton key={a.id} account={a} next={next} />)}</div>
        </section>
      ))}
      <details className="group rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-700">
          Klassische Anmeldung mit Benutzername
          <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <p className="mt-2 text-xs text-slate-500">
          Passwort für alle Demo-Konten: <code className="rounded bg-white px-1.5 py-0.5 font-mono">{DEMO_PASSWORD}</code>
          {mode !== "admin" && <> · Registrierung testen mit Einladungscode <code className="rounded bg-white px-1.5 py-0.5 font-mono">{DEMO_INVITE_CODE}</code></>}
        </p>
        <LoginForm next={next} mode={mode} />
      </details>
    </div>
  );
}
