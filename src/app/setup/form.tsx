"use client";
import { useActionState } from "react";
import { setupAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function SetupForm() {
  const [state, action] = useActionState(setupAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Firmen-/Organisationsname" htmlFor="companyName"><input id="companyName" name="companyName" required className="input" placeholder="z. B. Muster GmbH" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vorname" htmlFor="firstName"><input id="firstName" name="firstName" required className="input" /></Field>
        <Field label="Nachname" htmlFor="lastName"><input id="lastName" name="lastName" required className="input" /></Field>
      </div>
      <Field label="Benutzername" htmlFor="username"><input id="username" name="username" required minLength={3} pattern="[a-zA-Z0-9._\-]+" className="input" defaultValue="admin" autoCapitalize="none" /></Field>
      <Field label="E-Mail (optional)" htmlFor="email"><input id="email" name="email" type="email" className="input" /></Field>
      <Field label="Passwort" htmlFor="password" hint="Mindestens 8 Zeichen"><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
      <Field label="Passwort wiederholen" htmlFor="confirm"><input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
      <SubmitButton className="w-full" pendingText="Einrichten …">Administrator anlegen</SubmitButton>
    </form>
  );
}
