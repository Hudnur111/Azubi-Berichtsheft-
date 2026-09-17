import { addDays, endOfMonth, startOfMonth, subDays } from "date-fns";
import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { MonthCalendar, parseMonth, type CalendarEvent } from "@/components/calendar/month-calendar";
import { reportTitle } from "@/lib/dates";

export default async function AzubiKalender({ searchParams }: { searchParams: Promise<{ monat?: string }> }) {
  const me = await requireAzubi();
  const { monat } = await searchParams;
  const month = parseMonth(monat);
  const from = subDays(startOfMonth(month), 7); const to = addDays(endOfMonth(month), 7);
  const [reports, rotations] = await Promise.all([
    db.report.findMany({ where: { azubiId: me.id, weekStart: { gte: from, lte: to } }, select: { id: true, type: true, year: true, week: true, day: true, status: true, weekStart: true } }),
    db.rotation.findMany({ where: { azubiId: me.id, startDate: { lte: to }, endDate: { gte: from } }, include: { department: { select: { name: true } } } }),
  ]);
  const events: CalendarEvent[] = rotations.flatMap((r) => [{ date: r.startDate, title: `Start: ${r.department.name}` }, { date: r.endDate, title: `Ende: ${r.department.name}` }]);
  return (
    <>
      <PageHeader title="Kalender" description="Deine Berichte im Monatsüberblick. Bernsteinfarbene Punkte markieren Tage bzw. Wochen ohne Bericht." />
      <MonthCalendar
        month={month}
        items={reports.map((r) => ({ ...r, label: r.type === "DAILY" ? undefined : reportTitle(r) }))}
        events={events}
        base="/azubi/kalender"
        hrefFor={(it) => `/azubi/berichte/${it.id}`}
        expectedFrom={me.ausbildungsbeginn}
        mode={me.berichtsheftTyp ?? "WEEKLY"}
      />
    </>
  );
}
