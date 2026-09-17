import { addDays, endOfMonth, startOfMonth, subDays } from "date-fns";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { azubiScope, reportScope } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNav } from "@/components/ui/select-nav";
import { MonthCalendar, parseMonth, type CalendarEvent } from "@/components/calendar/month-calendar";
import { germanHolidays } from "@/lib/holidays";
import { getSettings } from "@/lib/settings";
import { fullName } from "@/lib/utils";

export default async function AdminKalender({ searchParams }: { searchParams: Promise<{ monat?: string; azubi?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const month = parseMonth(sp.monat);
  const from = subDays(startOfMonth(month), 7); const to = addDays(endOfMonth(month), 7);
  const azubis = await db.user.findMany({ where: { active: true, ...azubiScope(me) }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, berichtsheftTyp: true, ausbildungsbeginn: true } });
  const selected = sp.azubi ? azubis.find((a) => a.id === sp.azubi) : undefined;
  const [reports, rotations] = await Promise.all([
    db.report.findMany({ where: { ...reportScope(me), ...(selected ? { azubiId: selected.id } : {}), weekStart: { gte: from, lte: to } }, select: { id: true, type: true, year: true, week: true, day: true, status: true, weekStart: true, azubi: { select: { firstName: true, lastName: true } } } }),
    selected ? db.rotation.findMany({ where: { azubiId: selected.id, startDate: { lte: to }, endDate: { gte: from } }, include: { department: { select: { name: true } } } }) : [],
  ]);
  const { bundesland } = await getSettings();
  const events: CalendarEvent[] = [
    ...germanHolidays(month.getFullYear(), bundesland).map((h) => ({ date: h.date, title: h.name, tone: "warning" as const })),
    ...rotations.flatMap((r) => [{ date: r.startDate, title: `Start: ${r.department.name}` }, { date: r.endDate, title: `Ende: ${r.department.name}` }]),
  ];
  const base = "/admin/kalender";
  return (
    <>
      <PageHeader
        title="Kalender"
        description={selected ? `Berichte von ${fullName(selected)}` : `Alle Berichte deiner ${azubis.length} Azubis – für Lücken-Anzeige bitte einen Azubi wählen.`}
        actions={<SelectNav value={selected?.id ?? ""} placeholder="Alle Azubis" options={azubis.map((a) => ({ value: a.id, label: fullName(a) }))} param="azubi" basePath={base} keep={{ monat: sp.monat }} />}
      />
      <MonthCalendar
        month={month}
        items={reports.map((r) => ({ ...r, label: selected ? undefined : `${r.azubi.firstName} ${r.azubi.lastName[0]}.` }))}
        events={events}
        base={base}
        keep={{ azubi: selected?.id }}
        hrefFor={(it) => `/admin/berichte/${it.id}`}
        expectedFrom={selected?.ausbildungsbeginn}
        mode={selected ? (selected.berichtsheftTyp ?? "WEEKLY") : "MIXED"}
      />
    </>
  );
}
