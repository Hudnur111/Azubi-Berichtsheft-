"use client";
import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Neues Passwort" htmlFor="password" hint="Mindestens 8 Zeichen"><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
      <Field label="Passwort wiederholen" htmlFor="confirm"><input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" /></Field>
      <SubmitButton className="w-full" pendingText="Speichern …">Passwort speichern</SubmitButton>
    </form>
  );
}
