"use client";
import { useActionState } from "react";
import { changePasswordAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function PasswordForm({ forced }: { forced?: boolean }) {
  const [state, action] = useActionState(changePasswordAction, null);
  return (
    <form action={action} className="space-y-3">
      {forced && !state?.ok && <Alert tone="info">Bitte vergib jetzt ein eigenes Passwort.</Alert>}
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
      <Field label="Aktuelles Passwort" htmlFor="current"><input id="current" name="current" type="password" autoComplete="current-password" required className="input" /></Field>
      <Field label="Neues Passwort" htmlFor="password" hint="Mindestens 8 Zeichen"><input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" /></Field>
      <Field label="Neues Passwort wiederholen" htmlFor="confirm"><input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="input" /></Field>
      <SubmitButton pendingText="Speichern …">Passwort ändern</SubmitButton>
    </form>
  );
}
