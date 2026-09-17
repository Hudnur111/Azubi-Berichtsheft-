"use client";
import { useActionState } from "react";
import { checkInviteCode, registerAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function CodeForm({ invalid }: { invalid: boolean }) {
  const [state, action] = useActionState(checkInviteCode, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      {(state?.error || invalid) && <Alert tone="error">{state?.error ?? "Code ungültig oder bereits verwendet."}</Alert>}
      <Field label="Einladungscode" htmlFor="code">
        <input id="code" name="code" required maxLength={8} className="input text-center font-mono text-xl uppercase tracking-[0.3em]" placeholder="XXXXXXXX" autoCapitalize="characters" autoComplete="off" />
      </Field>
      <SubmitButton className="w-full" pendingText="Prüfen …">Weiter</SubmitButton>
    </form>
  );
}

export function RegisterForm({ code }: { code: string }) {
  const [state, action] = useActionState(registerAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="code" value={code} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Benutzername" htmlFor="username" hint="3–32 Zeichen, z. B. vorname.nachname">
        <input id="username" name="username" required minLength={3} maxLength={32} pattern="[a-zA-Z0-9._\-]+" autoComplete="username" className="input" autoCapitalize="none" />
      </Field>
      <Field label="E-Mail (optional)" htmlFor="email" hint="Für Passwort-Zurücksetzen und E-Mail-Benachrichtigungen">
        <input id="email" name="email" type="email" autoComplete="email" className="input" />
      </Field>
      <Field label="Passwort" htmlFor="password" hint="Mindestens 8 Zeichen">
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </Field>
      <Field label="Passwort wiederholen" htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </Field>
      <SubmitButton className="w-full" pendingText="Zugang wird aktiviert …">Zugang aktivieren</SubmitButton>
    </form>
  );
}
