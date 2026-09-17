import { NextResponse, type NextRequest } from "next/server";
import { getISODay, subDays } from "date-fns";
import { db } from "@/lib/db";
import { holidayMap } from "@/lib/holidays";
import { getSettings } from "@/lib/settings";
import { notifyMany } from "@/lib/audit";
import { currentWeek, fmtDate, isoWeekOf, missingUnits, weekLabel } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Täglicher Cron (Vercel: siehe vercel.json). Entscheidet nach Wochentag:
 *  - Montag:   „Neue Woche“ an alle Azubis + Wochenübersicht an Ausbildung
 *  - Freitag:  Erinnerung an Azubis mit Wochenbericht, die die laufende Woche noch nicht eingereicht haben
 *  - Mo–Fr:    Erinnerung an Azubis mit Tagesbericht, deren Vortag fehlt
 *  - täglich:  Ausbildung: Berichte, die > 5 Tage auf Prüfung warten
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const now = new Date();
  const dow = getISODay(now);
  const cw = currentWeek();
  const holidays = holidayMap([now.getFullYear() - 1, now.getFullYear()], (await getSettings()).bundesland);
  const stats = { newWeek: 0, fridayReminder: 0, dailyReminder: 0, staffPending: 0 };

  const azubis = await db.user.findMany({
    where: { role: "AZUBI", active: true },
    select: { id: true, berichtsheftTyp: true, ausbildungsbeginn: true, reports: { select: { year: true, week: true, day: true, status: true } } },
  });
  const staff = await db.user.findMany({ where: { role: { in: ["ADMIN", "AUSBILDER", "ABTEILUNGSLEITER"] }, active: true }, select: { id: true } });

  if (dow === 1) {
    await notifyMany(azubis.map((a) => a.id), `Neue Woche: ${weekLabel(cw.year, cw.week)}`, "Eine neue Berichtswoche hat begonnen. Leg deinen Bericht an und trag deine Tätigkeiten laufend ein.", "/azubi");
    stats.newWeek = azubis.length;
    const backlog = azubis.filter((a) => missingUnits(a.berichtsheftTyp, a.ausbildungsbeginn, a.reports, now, holidays).length > 0).length;
    const pending = await db.report.count({ where: { status: "SUBMITTED" } });
    await notifyMany(staff.map((s) => s.id), `Wochenstart ${weekLabel(cw.year, cw.week)}`, `${pending} Bericht(e) warten auf Prüfung, ${backlog} Azubi(s) haben Rückstände.`, "/admin");
  }

  if (dow === 5) {
    const ids = azubis
      .filter((a) => a.berichtsheftTyp !== "DAILY")
      .filter((a) => !a.reports.some((r) => r.year === cw.year && r.week === cw.week && r.day === 0 && (r.status === "SUBMITTED" || r.status === "APPROVED")))
      .map((a) => a.id);
    await notifyMany(ids, "Wochenbericht einreichen", `Die Woche ${weekLabel(cw.year, cw.week)} endet – bitte den Bericht fertigstellen und zur Prüfung einreichen.`, "/azubi/berichte");
    stats.fridayReminder = ids.length;
  }

  if (dow >= 2 && dow <= 5) {
    const y = subDays(now, 1); const yw = isoWeekOf(y); const yd = getISODay(y);
    const yHoliday = holidays.has(fmtDate(y, "yyyy-MM-dd"));
    const ids = azubis
      .filter((a) => a.berichtsheftTyp === "DAILY" && !yHoliday)
      .filter((a) => !a.reports.some((r) => r.year === yw.year && r.week === yw.week && r.day === yd))
      .map((a) => a.id);
    await notifyMany(ids, "Tagesbericht fehlt", `Für ${fmtDate(y, "EEEE, dd.MM.")} liegt noch kein Bericht vor.`, "/azubi/berichte");
    stats.dailyReminder = ids.length;
  }

  const stale = await db.report.count({ where: { status: "SUBMITTED", submittedAt: { lt: subDays(now, 5) } } });
  if (stale > 0) {
    await notifyMany(staff.map((s) => s.id), "Prüfungen überfällig", `${stale} Bericht(e) warten seit mehr als 5 Tagen auf Prüfung.`, "/admin/pruefung");
    stats.staffPending = stale;
  }

  await db.auditLog.create({ data: { action: "CRON_DAILY", targetType: "System", details: stats } });
  return NextResponse.json({ ok: true, date: now.toISOString(), weekday: dow, ...stats });
}
