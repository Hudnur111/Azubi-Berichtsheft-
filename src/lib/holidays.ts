import { addDays, format } from "date-fns";

/** Ostersonntag (Gauß / Meeus-Jones-Butcher). */
function easter(year: number) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Gesetzliche Feiertage in Deutschland für ein Jahr (bundesweit + landesspezifisch). */
export function germanHolidays(year: number, land?: string | null): { date: Date; name: string }[] {
  const e = easter(year);
  const list: { date: Date; name: string }[] = [
    { date: new Date(year, 0, 1), name: "Neujahr" },
    { date: addDays(e, -2), name: "Karfreitag" },
    { date: addDays(e, 1), name: "Ostermontag" },
    { date: new Date(year, 4, 1), name: "Tag der Arbeit" },
    { date: addDays(e, 39), name: "Christi Himmelfahrt" },
    { date: addDays(e, 50), name: "Pfingstmontag" },
    { date: new Date(year, 9, 3), name: "Tag der Deutschen Einheit" },
    { date: new Date(year, 11, 25), name: "1. Weihnachtstag" },
    { date: new Date(year, 11, 26), name: "2. Weihnachtstag" },
  ];
  const L = land ?? "";
  if (["BW", "BY", "ST"].includes(L)) list.push({ date: new Date(year, 0, 6), name: "Heilige Drei Könige" });
  if (["BE", "MV"].includes(L)) list.push({ date: new Date(year, 2, 8), name: "Internationaler Frauentag" });
  if (["BW", "BY", "HE", "NW", "RP", "SL"].includes(L)) list.push({ date: addDays(e, 60), name: "Fronleichnam" });
  if (["SL"].includes(L) || L === "BY") list.push({ date: new Date(year, 7, 15), name: "Mariä Himmelfahrt" });
  if (["TH"].includes(L)) list.push({ date: new Date(year, 8, 20), name: "Weltkindertag" });
  if (["BB", "MV", "SN", "ST", "TH", "HB", "HH", "NI", "SH"].includes(L)) list.push({ date: new Date(year, 9, 31), name: "Reformationstag" });
  if (["BW", "BY", "NW", "RP", "SL"].includes(L)) list.push({ date: new Date(year, 10, 1), name: "Allerheiligen" });
  if (L === "SN") { const d = new Date(year, 10, 22); while (d.getDay() !== 3) d.setDate(d.getDate() + 1); list.push({ date: d, name: "Buß- und Bettag" }); }
  return list.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function holidayMap(years: number[], land?: string | null) {
  const map = new Map<string, string>();
  for (const y of years) for (const h of germanHolidays(y, land)) map.set(format(h.date, "yyyy-MM-dd"), h.name);
  return map;
}

export const holidayName = (date: Date, land?: string | null) => holidayMap([date.getFullYear()], land).get(format(date, "yyyy-MM-dd")) ?? null;
