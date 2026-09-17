"use client";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="E-Mail" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="vorname.nachname@firma.de" />
      </Field>
      <Field label="Passwort" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <SubmitButton className="w-full" pendingText="Anmelden …">Anmelden</SubmitButton>
      <p className="text-center text-xs text-slate-400">Passwort vergessen? Bitte an Ausbilder/in oder Admin wenden.</p>
    </form>
  );
}
