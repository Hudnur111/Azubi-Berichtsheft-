import {
  addDays, differenceInCalendarWeeks, eachDayOfInterval, endOfISOWeek, format, getISOWeek, getISOWeekYear,
  isAfter, isBefore, setISOWeek, startOfISOWeek, startOfDay,
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
