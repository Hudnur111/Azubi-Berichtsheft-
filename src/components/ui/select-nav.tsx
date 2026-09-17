"use client";
import { useRouter } from "next/navigation";

/** Dropdown, das bei Auswahl den Query-Parameter `param` setzt und navigiert. Andere Parameter aus `keep` bleiben erhalten. */
export function SelectNav({ value, options, param, basePath, keep = {}, placeholder, className }: {
  value: string; options: { value: string; label: string }[]; param: string; basePath: string; keep?: Record<string, string | undefined>; placeholder: string; className?: string;
}) {
  const router = useRouter();
  const go = (v: string) => {
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries(keep)) if (val && k !== param) q.set(k, val);
    if (v) q.set(param, v);
    const s = q.toString();
    router.push(`${basePath}${s ? `?${s}` : ""}`);
  };
  return (
    <select value={value} onChange={(e) => go(e.target.value)} className={className ?? "input w-auto py-1.5 text-xs"}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
