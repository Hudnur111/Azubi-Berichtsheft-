"use client";
import { useActionState, useState } from "react";
import { GraduationCap, Users } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

export function LoginForm({ next, mode }: { next?: string; mode: "azubi" | "admin" | "both" }) {
  const [state, action] = useActionState(loginAction, null);
  const [group, setGroup] = useState<"AZUBI" | "STAFF">(mode === "admin" ? "STAFF" : "AZUBI");
  return (
    <form action={action} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="group" value={group} />
      {mode === "both" && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Portal">
          {([["AZUBI", "Azubi", GraduationCap], ["STAFF", "Ausbildung", Users]] as const).map(([g, label, Icon]) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} onClick={() => setGroup(g)} className={cn("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition", group === g ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      )}
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Benutzername oder E-Mail" htmlFor="login">
        <input id="login" name="login" type="text" autoComplete="username" required className="input" placeholder="z. B. max.muster" autoCapitalize="none" />
      </Field>
      <Field label="Passwort" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" name="remember" className="h-4 w-4 rounded border-slate-300" /> Angemeldet bleiben (30 Tage)</label>
      <SubmitButton className="w-full" pendingText="Anmelden …">Anmelden</SubmitButton>
    </form>
  );
}
