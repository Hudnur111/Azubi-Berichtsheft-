"use client";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.message}</Alert>}
      <Field label="E-Mail" htmlFor="email"><input id="email" name="email" type="email" required autoComplete="email" className="input" /></Field>
      <SubmitButton className="w-full" pendingText="Senden …">Link anfordern</SubmitButton>
    </form>
  );
}
