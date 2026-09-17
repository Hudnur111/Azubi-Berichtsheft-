import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stat({ label, value, icon: Icon, tone = "brand", hint }: { label: string; value: React.ReactNode; icon: LucideIcon; tone?: "brand" | "success" | "danger" | "warning" | "neutral"; hint?: string }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    success: "bg-emerald-50 text-emerald-700",
    danger: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs leading-tight text-slate-500 sm:text-sm">{label}</p>
        <p className="text-2xl font-semibold leading-tight text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
