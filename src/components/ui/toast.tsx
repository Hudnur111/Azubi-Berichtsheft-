import { Alert } from "./alert";

/** Zeigt ?ok=/?error= Query-Meldungen an. */
export function QueryToast({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return <div className="mb-4">{ok ? <Alert tone="success">{ok}</Alert> : <Alert tone="error">{error}</Alert>}</div>;
}
