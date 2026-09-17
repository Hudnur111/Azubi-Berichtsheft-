import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfISOWeek, format, getISODay, getISOWeek, isSameDay, isSameMonth, isWeekend, startOfISOWeek, startOfMonth, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import type { ReportStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type CalendarItem = { id: string; type: "WEEKLY" | "DAILY"; year: number; week: number; day: number; status: ReportStatus; weekStart: Date; label?: string };
export type CalendarEvent = { date: Date; title: string; tone?: "info" | "warning" | "brand" };

const statusDot: Record<ReportStatus, string> = { DRAFT: "bg-slate-300", SUBMITTED: "bg-sky-500", APPROVED: "bg-emerald-500", REJECTED: "bg-red-500" };
const statusBg: Record<ReportStatus, string> = { DRAFT: "bg-slate-100 text-slate-700", SUBMITTED: "bg-sky-50 text-sky-800", APPROVED: "bg-emerald-50 text-emerald-800", REJECTED: "bg-red-50 text-red-800" };

export function parseMonth(m?: string) {
  const d = m && /^\d{4}-\d{2}$/.test(m) ? new Date(`${m}-01T00:00:00`) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : startOfMonth(d);
}

/** Monatsansicht: Wochenberichte markieren Mo–Fr der Woche, Tagesberichte den Tag. */
export function MonthCalendar({ month, items, events = [], base, keep = {}, hrefFor, expectedFrom, mode }: {
  month: Date; items: CalendarItem[]; events?: CalendarEvent[]; base: string; keep?: Record<string, string | undefined>; hrefFor: (item: CalendarItem) => string; expectedFrom?: Date | null; mode: "WEEKLY" | "DAILY" | "MIXED";
}) {
  const today = new Date();
  const start = startOfISOWeek(startOfMonth(month));
  const end = endOfISOWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const byWeek = new Map<string, CalendarItem[]>();
  const byDay = new Map<string, CalendarItem[]>();
  for (const it of items) {
    if (it.type === "DAILY") { const k = format(it.weekStart, "yyyy-MM-dd"); byDay.set(k, [...(byDay.get(k) ?? []), it]); }
    else { const k = `${it.year}-${it.week}`; byWeek.set(k, [...(byWeek.get(k) ?? []), it]); }
  }
  const prev = format(subMonths(month, 1), "yyyy-MM"); const next = format(addMonths(month, 1), "yyyy-MM");
  const nav = (m?: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) q.set(k, v);
    if (m) q.set("monat", m);
    const qs = q.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <Link href={nav(prev)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Vorheriger Monat"><ChevronLeft className="h-4 w-4" /></Link>
        <div className="text-center">
          <p className="text-base font-semibold capitalize">{format(month, "MMMM yyyy", { locale: de })}</p>
          <Link href={nav()} className="text-xs text-brand-600 hover:underline">Heute</Link>
        </div>
        <Link href={nav(next)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Nächster Monat"><ChevronRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <div className="py-2">KW</div>
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      {weeks.map((w) => {
        const kw = getISOWeek(w[0]);
        const key = `${format(w[3], "RRRR")}-${kw}`;
        const weekItems = byWeek.get(key) ?? [];
        const weekStatus = weekItems[0]?.status;
        const weekMissing = mode !== "DAILY" && !weekItems.length && expectedFrom && w[0] >= startOfISOWeek(expectedFrom) && w[0] < startOfISOWeek(today);
        return (
          <div key={key} className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
            <div className="flex flex-col items-center justify-center gap-1 border-r border-slate-100 bg-slate-50/60 py-2 text-xs text-slate-500">
              <span>{kw}</span>
              {weekItems[0] && mode !== "DAILY" && <Link href={hrefFor(weekItems[0])} className={cn("h-2.5 w-2.5 rounded-full", statusDot[weekItems[0].status])} title={`${STATUS_LABELS[weekItems[0].status]}${weekItems[0].label ? ` · ${weekItems[0].label}` : ""}`} />}
              {weekItems.length > 1 && <span className="text-[10px]">+{weekItems.length - 1}</span>}
            </div>
            {w.map((d) => {
              const inMonth = isSameMonth(d, month);
              const dk = format(d, "yyyy-MM-dd");
              const dayItems = byDay.get(dk) ?? [];
              const wd = getISODay(d);
              const workday = wd <= 5;
              const weeklyCover = workday && weekStatus && mode !== "DAILY";
              const evs = events.filter((e) => isSameDay(e.date, d));
              const isHoliday = evs.some((e) => e.tone === "warning");
              const dayMissing = mode === "DAILY" && workday && !dayItems.length && !isHoliday && expectedFrom && d >= expectedFrom && d < today;
              return (
                <div key={dk} className={cn("min-h-[76px] border-r border-slate-100 p-1.5 last:border-r-0", !inMonth && "bg-slate-50/50 text-slate-300", isWeekend(d) && inMonth && "bg-slate-50/40")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", isSameDay(d, today) ? "bg-brand-600 font-semibold text-white" : inMonth ? "text-slate-700" : "")}>{format(d, "d")}</span>
                    {(weekMissing && workday && inMonth) || (dayMissing && inMonth) ? <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Kein Bericht" /> : null}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {weeklyCover && inMonth && weekItems.slice(0, 2).map((it) => (
                      <Link key={it.id} href={hrefFor(it)} className={cn("block truncate rounded px-1 py-0.5 text-[10px] font-medium", statusBg[it.status])}>{it.label ?? STATUS_LABELS[it.status]}</Link>
                    ))}
                    {dayItems.slice(0, 3).map((it) => (
                      <Link key={it.id} href={hrefFor(it)} className={cn("block truncate rounded px-1 py-0.5 text-[10px] font-medium", statusBg[it.status])}>{it.label ?? STATUS_LABELS[it.status]}</Link>
                    ))}
                    {dayItems.length > 3 && <p className="text-[10px] text-slate-400">+{dayItems.length - 3}</p>}
                    {evs.map((e, i) => <p key={i} className={cn("truncate rounded px-1 py-0.5 text-[10px]", e.tone === "warning" ? "bg-amber-50 text-amber-800" : e.tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-indigo-50 text-indigo-700")}>{e.title}</p>)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
        {(Object.keys(STATUS_LABELS) as ReportStatus[]).map((s) => <span key={s} className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", statusDot[s])} />{STATUS_LABELS[s]}</span>)}
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Kein Bericht</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400" />Abteilungseinsatz</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-300" />Feiertag</span>
      </div>
    </Card>
  );
}
