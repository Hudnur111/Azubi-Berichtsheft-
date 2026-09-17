import {
  addDays, differenceInCalendarWeeks, eachDayOfInterval, endOfISOWeek, format, getISODay, getISOWeek, getISOWeekYear,
  isAfter, isBefore, isWeekend, setISOWeek, startOfISOWeek, startOfDay,
} from "date-fns";
import { de } from "date-fns/locale";

export const fmtDate = (d: Date | string | null | undefined, pattern = "dd.MM.yyyy") =>
  d ? format(new Date(d), pattern, { locale: de }) : "–";
export const fmtDateTime = (d: Date | string | null | undefined) => fmtDate(d, "dd.MM.yyyy HH:mm");
export const weekdayShort = (d: Date) => format(d, "EEEEEE", { locale: de });
export const weekdayLong = (d: Date) => format(d, "EEEE", { locale: de });

export function isoWeekOf(date: Date) {
  return { year: getISOWeekYear(date), week: getISOWeek(date) };
}

export function weekRange(year: number, week: number) {
  const base = setISOWeek(new Date(year, 5, 1), week);
  const start = startOfISOWeek(base);
  return { start, end: endOfISOWeek(start), workdays: eachDayOfInterval({ start, end: addDays(start, 4) }) };
}

export function currentWeek() {
  return isoWeekOf(new Date());
}

export function shiftWeek(year: number, week: number, delta: number) {
  const { start } = weekRange(year, week);
  return isoWeekOf(addDays(start, delta * 7));
}

export const weekLabel = (year: number, week: number) => `KW ${String(week).padStart(2, "0")}/${year}`;

/** Alle ISO-Wochen zwischen Ausbildungsbeginn (oder default) und heute. */
export function expectedWeeks(from: Date | null | undefined, to: Date = new Date()) {
  const start = startOfISOWeek(from ?? addDays(to, -7 * 8));
  const end = startOfISOWeek(to);
  const n = differenceInCalendarWeeks(end, start, { weekStartsOn: 1 });
  const out: { year: number; week: number; start: Date }[] = [];
  for (let i = 0; i <= n; i++) {
    const d = addDays(start, i * 7);
    if (isAfter(d, end)) break;
    out.push({ ...isoWeekOf(d), start: d });
  }
  return out;
}

export function ausbildungsjahrAt(begin: Date | null | undefined, at: Date = new Date()) {
  if (!begin) return null;
  if (isBefore(at, begin)) return 1;
  const years = Math.floor((startOfDay(at).getTime() - startOfDay(begin).getTime()) / (365.25 * 86400000));
  return Math.min(4, years + 1);
}

/** Alle Werktage (Mo–Fr) zwischen Ausbildungsbeginn (oder default) und heute – für Tagesberichte. */
export function expectedWorkdays(from: Date | null | undefined, to: Date = new Date()) {
  const start = startOfDay(from ?? addDays(to, -7 * 8));
  const end = startOfDay(to);
  if (isAfter(start, end)) return [];
  return eachDayOfInterval({ start, end })
    .filter((d) => !isWeekend(d))
    .map((d) => ({ ...isoWeekOf(d), day: getISODay(d), date: d }));
}

export const dayKey = (year: number, week: number, day: number) => `${year}-${week}-${day}`;

/** Titel eines Berichts: "KW 38/2026" oder "Tagesbericht Mi, 16.09.2026". */
export function reportTitle(r: { type: "WEEKLY" | "DAILY"; year: number; week: number; weekStart: Date | string }) {
  if (r.type === "DAILY") return `Tagesbericht ${format(new Date(r.weekStart), "EEEEEE, dd.MM.yyyy", { locale: de })}`;
  return weekLabel(r.year, r.week);
}

export const toDateInput = (d: Date) => format(d, "yyyy-MM-dd");

/** Fehlende Berichtseinheiten (Wochen bzw. Werktage) eines Azubis, aktuelle Einheit ausgenommen. */
export function missingUnits(type: "WEEKLY" | "DAILY" | null | undefined, begin: Date | null | undefined, reports: { year: number; week: number; day: number }[], now: Date = new Date()) {
  const have = new Set(reports.map((r) => dayKey(r.year, r.week, r.day)));
  const cw = isoWeekOf(now);
  if (type === "DAILY") {
    const today = getISODay(now);
    return expectedWorkdays(begin, now)
      .filter((d) => !have.has(dayKey(d.year, d.week, d.day)) && !(d.year === cw.year && d.week === cw.week && d.day === today))
      .map((d) => ({ key: dayKey(d.year, d.week, d.day), label: format(d.date, "EEEEEE dd.MM.", { locale: de }) }));
  }
  return expectedWeeks(begin, now)
    .filter((w) => !have.has(dayKey(w.year, w.week, 0)) && !(w.year === cw.year && w.week === cw.week))
    .map((w) => ({ key: dayKey(w.year, w.week, 0), label: weekLabel(w.year, w.week) }));
}
