"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-semibold">Etwas ist schiefgelaufen</h1>
      <p className="max-w-md text-sm text-slate-500">{error.message || "Unerwarteter Fehler."}{error.digest && <span className="block text-xs text-slate-400">Ref: {error.digest}</span>}</p>
      <Button onClick={reset} variant="outline">Erneut versuchen</Button>
    </main>
  );
}
