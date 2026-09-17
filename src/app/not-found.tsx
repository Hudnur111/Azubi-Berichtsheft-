import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <h1 className="text-xl font-semibold">Seite nicht gefunden</h1>
      <p className="text-sm text-slate-500">Der Bericht oder die Seite existiert nicht oder du hast keinen Zugriff.</p>
      <Link href="/" className="mt-2 text-sm font-medium text-brand-600 hover:underline">Zur Startseite</Link>
    </main>
  );
}
