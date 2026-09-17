export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Lädt …">
      <div className="space-y-2"><div className="h-7 w-64 rounded-lg bg-slate-200" /><div className="h-4 w-96 max-w-full rounded bg-slate-100" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-100" />)}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">{Array.from({ length: rows }, (_, i) => <div key={i} className="mb-3 h-5 rounded bg-slate-100 last:mb-0" style={{ width: `${60 + ((i * 17) % 40)}%` }} />)}</div>
    </div>
  );
}
