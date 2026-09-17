"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, type EntryCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAzubi, requireUser, requireStaff } from "@/lib/auth";
import { audit, notify, notifyMany } from "@/lib/audit";
import { ausbildungsjahrAt, weekRange, weekLabel } from "@/lib/dates";
import { CATEGORIES } from "@/lib/labels";
import { reportScope } from "@/lib/permissions";
import type { ActionState } from "@/lib/utils";
import { fullName } from "@/lib/utils";

/* ---------- Helpers ---------- */

async function currentDepartmentFor(azubiId: string, fallback: string | null) {
  const now = new Date();
  const rot = await db.rotation.findFirst({
    where: { azubiId, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: "desc" },
  });
  return rot?.departmentId ?? fallback;
}

/** Empfänger für Benachrichtigungen zu einem Azubi-Bericht (Ausbilder + Abteilungsleitung + Admins). */
async function reviewersFor(azubiId: string, departmentId: string | null) {
  const azubi = await db.user.findUnique({ where: { id: azubiId }, select: { trainerId: true, departmentId: true } });
  const deptIds = [departmentId, azubi?.departmentId].filter(Boolean) as string[];
  const users = await db.user.findMany({
    where: {
      active: true,
      OR: [
        { id: azubi?.trainerId ?? "__none__" },
        { role: "ADMIN" },
        ...(deptIds.length ? [{ role: { in: ["AUSBILDER" as const, "ABTEILUNGSLEITER" as const] }, departmentId: { in: deptIds } }] : []),
      ],
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/* ---------- Azubi: Bericht anlegen / öffnen ---------- */

export async function openOrCreateReport(year: number, week: number) {
  const me = await requireAzubi();
  const existing = await db.report.findUnique({ where: { azubiId_year_week: { azubiId: me.id, year, week } } });
  if (existing) redirect(`/azubi/berichte/${existing.id}`);

  const { start, end, workdays } = weekRange(year, week);
  const departmentId = await currentDepartmentFor(me.id, me.departmentId);
  const report = await db.report.create({
    data: {
      azubiId: me.id,
      year, week, weekStart: start, weekEnd: end,
      departmentId,
      ausbildungsjahr: ausbildungsjahrAt(me.ausbildungsbeginn, start),
      entries: { create: workdays.map((d, i) => ({ date: d, sortOrder: i, hours: 8 })) },
    },
  });
  await audit(me.id, "REPORT_CREATED", "Report", report.id, { year, week });
  redirect(`/azubi/berichte/${report.id}/bearbeiten`);
}

export async function createReportFromForm(formData: FormData) {
  const year = Number(formData.get("year"));
  const week = Number(formData.get("week"));
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) redirect("/azubi/berichte?error=Ungültige+Woche");
  await openOrCreateReport(year, week);
}

/* ---------- Azubi: Speichern ---------- */

const entrySchema = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES as [EntryCategory, ...EntryCategory[]]),
  description: z.string().max(4000),
  hours: z.coerce.number().min(0).max(24),
});

const saveSchema = z.object({
  reportId: z.string(),
  summary: z.string().max(2000).optional().default(""),
  entries: z.array(entrySchema),
});

export type SavePayload = z.infer<typeof saveSchema>;

export async function saveReport(payload: SavePayload): Promise<ActionState> {
  const me = await requireAzubi();
  const parsed = saveSchema.safeParse(payload);
  if (!parsed.success) return { error: "Ungültige Daten: " + parsed.error.issues[0]?.message };
  const { reportId, summary, entries } = parsed.data;

  const report = await db.report.findFirst({ where: { id: reportId, azubiId: me.id }, include: { entries: { select: { id: true } } } });
  if (!report) return { error: "Bericht nicht gefunden." };
  if (report.status === "SUBMITTED" || report.status === "APPROVED") return { error: "Eingereichte oder genehmigte Berichte können nicht bearbeitet werden." };

  const ownIds = new Set(report.entries.map((e) => e.id));
  await db.$transaction([
    db.report.update({ where: { id: reportId }, data: { summary } }),
    ...entries
      .filter((e) => ownIds.has(e.id))
      .map((e) =>
        db.reportEntry.update({
          where: { id: e.id },
          data: { category: e.category, description: e.description, hours: new Prisma.Decimal(e.hours) },
        }),
      ),
  ]);
  revalidatePath(`/azubi/berichte/${reportId}`);
  return { ok: true, message: "Gespeichert" };
}


/* ---------- Azubi: Einreichen / Zurückziehen / Löschen ---------- */

export async function submitReport(formData: FormData) {
  await submitReportById(String(formData.get("reportId")));
}

/** Einreichen per ID (wird auch vom Editor nach dem Autosave aufgerufen). */
export async function submitReportById(reportId: string) {
  const me = await requireAzubi();
  const report = await db.report.findFirst({ where: { id: reportId, azubiId: me.id }, include: { entries: true } });
  if (!report) redirect("/azubi/berichte?error=Bericht+nicht+gefunden");
  if (report.status === "SUBMITTED" || report.status === "APPROVED") redirect(`/azubi/berichte/${reportId}`);

  const filled = report.entries.filter((e) => e.description.trim().length > 0 || ["URLAUB", "KRANK", "FEIERTAG"].includes(e.category));
  if (filled.length < report.entries.length) {
    redirect(`/azubi/berichte/${reportId}/bearbeiten?error=${encodeURIComponent("Bitte alle Tage ausfüllen (oder als Urlaub/Krank/Feiertag markieren).")}`);
  }

  await db.report.update({
    where: { id: reportId },
    data: { status: "SUBMITTED", submittedAt: new Date(), reviewNote: null, reviewedAt: null, reviewerId: null, version: report.status === "REJECTED" ? { increment: 1 } : undefined },
  });
  await audit(me.id, "REPORT_SUBMITTED", "Report", reportId, { week: weekLabel(report.year, report.week) });
  const recipients = await reviewersFor(me.id, report.departmentId);
  await notifyMany(recipients, "Neuer Bericht zur Prüfung", `${fullName(me)} hat ${weekLabel(report.year, report.week)} eingereicht.`, `/admin/berichte/${reportId}`);
  revalidatePath("/azubi");
  redirect(`/azubi/berichte/${reportId}?ok=${encodeURIComponent("Bericht wurde zur Prüfung eingereicht.")}`);
}

export async function withdrawReport(formData: FormData) {
  const me = await requireAzubi();
  const reportId = String(formData.get("reportId"));
  const report = await db.report.findFirst({ where: { id: reportId, azubiId: me.id, status: "SUBMITTED" } });
  if (!report) redirect(`/azubi/berichte/${reportId}?error=${encodeURIComponent("Zurückziehen nicht möglich.")}`);
  await db.report.update({ where: { id: reportId }, data: { status: "DRAFT", submittedAt: null } });
  await audit(me.id, "REPORT_WITHDRAWN", "Report", reportId);
  redirect(`/azubi/berichte/${reportId}/bearbeiten?ok=${encodeURIComponent("Bericht zurückgezogen – du kannst ihn weiter bearbeiten.")}`);
}

export async function deleteDraft(formData: FormData) {
  const me = await requireAzubi();
  const reportId = String(formData.get("reportId"));
  const report = await db.report.findFirst({ where: { id: reportId, azubiId: me.id, status: { in: ["DRAFT", "REJECTED"] } } });
  if (!report) redirect(`/azubi/berichte/${reportId}?error=${encodeURIComponent("Nur Entwürfe können gelöscht werden.")}`);
  await db.report.delete({ where: { id: reportId } });
  await audit(me.id, "REPORT_DELETED", "Report", reportId, { week: weekLabel(report.year, report.week) });
  redirect(`/azubi/berichte?ok=${encodeURIComponent("Entwurf gelöscht.")}`);
}

/* ---------- Kommentare (Azubi & Staff) ---------- */

export async function addComment(formData: FormData) {
  const me = await requireUser();
  const reportId = String(formData.get("reportId"));
  const text = String(formData.get("text") ?? "").trim();
  const back = me.role === "AZUBI" ? `/azubi/berichte/${reportId}` : `/admin/berichte/${reportId}`;
  if (!text) redirect(`${back}?error=${encodeURIComponent("Kommentar darf nicht leer sein.")}`);
  const report = await db.report.findFirst({ where: { id: reportId, ...reportScope(me) }, include: { azubi: { select: { id: true, firstName: true, lastName: true } } } });
  if (!report) redirect(`${back}?error=${encodeURIComponent("Kein Zugriff.")}`);
  await db.comment.create({ data: { reportId, authorId: me.id, text: text.slice(0, 4000) } });
  await audit(me.id, "COMMENT_ADDED", "Report", reportId);
  if (me.role === "AZUBI") {
    const recipients = await reviewersFor(me.id, report.departmentId);
    await notifyMany(recipients, "Neuer Kommentar", `${fullName(me)} hat ${weekLabel(report.year, report.week)} kommentiert.`, `/admin/berichte/${reportId}`);
  } else {
    await notify(report.azubi.id, "Neuer Kommentar", `${fullName(me)} hat ${weekLabel(report.year, report.week)} kommentiert.`, `/azubi/berichte/${reportId}`);
  }
  revalidatePath(back);
  redirect(back);
}

/* ---------- Staff: Prüfung ---------- */

async function reviewableReport(reportId: string) {
  const me = await requireStaff();
  const report = await db.report.findFirst({
    where: { id: reportId, ...reportScope(me) },
    include: { azubi: { select: { id: true, firstName: true, lastName: true } } },
  });
  return { me, report };
}

export async function approveReport(formData: FormData) {
  const reportId = String(formData.get("reportId"));
  const note = String(formData.get("note") ?? "").trim();
  const { me, report } = await reviewableReport(reportId);
  if (!report || report.status !== "SUBMITTED") redirect(`/admin/berichte/${reportId}?error=${encodeURIComponent("Bericht ist nicht zur Prüfung eingereicht.")}`);
  await db.report.update({ where: { id: reportId }, data: { status: "APPROVED", reviewedAt: new Date(), reviewerId: me.id, reviewNote: note || null } });
  await audit(me.id, "REPORT_APPROVED", "Report", reportId, { azubiId: report.azubiId });
  await notify(report.azubi.id, "Bericht genehmigt ✅", `${weekLabel(report.year, report.week)} wurde von ${fullName(me)} genehmigt.`, `/azubi/berichte/${reportId}`);
  revalidatePath("/admin");
  redirect(`/admin/pruefung?ok=${encodeURIComponent(`${weekLabel(report.year, report.week)} von ${fullName(report.azubi)} genehmigt.`)}`);
}

export async function rejectReport(formData: FormData) {
  const reportId = String(formData.get("reportId"));
  const note = String(formData.get("note") ?? "").trim();
  const { me, report } = await reviewableReport(reportId);
  if (!report || report.status !== "SUBMITTED") redirect(`/admin/berichte/${reportId}?error=${encodeURIComponent("Bericht ist nicht zur Prüfung eingereicht.")}`);
  if (note.length < 3) redirect(`/admin/berichte/${reportId}?error=${encodeURIComponent("Bitte eine Begründung für die Rückgabe angeben.")}`);
  await db.$transaction([
    db.report.update({ where: { id: reportId }, data: { status: "REJECTED", reviewedAt: new Date(), reviewerId: me.id, reviewNote: note } }),
    db.comment.create({ data: { reportId, authorId: me.id, text: `Rückgabe: ${note}` } }),
  ]);
  await audit(me.id, "REPORT_REJECTED", "Report", reportId, { azubiId: report.azubiId, note });
  await notify(report.azubi.id, "Bericht zurückgegeben", `${weekLabel(report.year, report.week)}: ${note}`, `/azubi/berichte/${reportId}/bearbeiten`);
  revalidatePath("/admin");
  redirect(`/admin/pruefung?ok=${encodeURIComponent(`${weekLabel(report.year, report.week)} an ${fullName(report.azubi)} zurückgegeben.`)}`);
}

export async function bulkApprove(formData: FormData) {
  const me = await requireStaff();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) redirect("/admin/pruefung?error=Keine+Berichte+ausgewählt");
  const reports = await db.report.findMany({
    where: { id: { in: ids }, status: "SUBMITTED", ...reportScope(me) },
    select: { id: true, azubiId: true, year: true, week: true },
  });
  await db.report.updateMany({ where: { id: { in: reports.map((r) => r.id) } }, data: { status: "APPROVED", reviewedAt: new Date(), reviewerId: me.id } });
  for (const r of reports) {
    await audit(me.id, "REPORT_APPROVED", "Report", r.id, { bulk: true });
    await notify(r.azubiId, "Bericht genehmigt ✅", `${weekLabel(r.year, r.week)} wurde von ${fullName(me)} genehmigt.`, `/azubi/berichte/${r.id}`);
  }
  revalidatePath("/admin");
  redirect(`/admin/pruefung?ok=${encodeURIComponent(`${reports.length} Bericht(e) genehmigt.`)}`);
}

/** Staff: Bericht wieder öffnen (z. B. nach versehentlicher Genehmigung). */
export async function reopenReport(formData: FormData) {
  const reportId = String(formData.get("reportId"));
  const { me, report } = await reviewableReport(reportId);
  if (!report || me.role !== "ADMIN") redirect(`/admin/berichte/${reportId}?error=${encodeURIComponent("Nur Admins können Berichte wieder öffnen.")}`);
  await db.report.update({ where: { id: reportId }, data: { status: "SUBMITTED", reviewedAt: null, reviewerId: null } });
  await audit(me.id, "REPORT_REOPENED", "Report", reportId);
  redirect(`/admin/berichte/${reportId}?ok=${encodeURIComponent("Bericht wieder zur Prüfung geöffnet.")}`);
}

/* ---------- Textbausteine ---------- */

const templateSchema = z.object({
  title: z.string().trim().min(2, "Titel zu kurz").max(120),
  content: z.string().trim().min(2, "Inhalt zu kurz").max(4000),
  category: z.enum(CATEGORIES as [EntryCategory, ...EntryCategory[]]).default("BETRIEB"),
  isGlobal: z.coerce.boolean().optional().default(false),
  departmentId: z.string().optional(),
});

export async function saveTemplate(formData: FormData) {
  const me = await requireUser();
  const back = me.role === "AZUBI" ? "/azubi/vorlagen" : "/admin/vorlagen";
  const raw = Object.fromEntries(formData);
  const parsed = templateSchema.safeParse({ ...raw, isGlobal: raw.isGlobal === "on" });
  if (!parsed.success) redirect(`${back}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ungültig")}`);
  const d = parsed.data;
  const isGlobal = me.role === "AZUBI" ? false : d.isGlobal;
  await db.template.create({
    data: {
      title: d.title, content: d.content, category: d.category, isGlobal,
      ownerId: isGlobal ? null : me.id,
      departmentId: me.role === "AZUBI" ? null : d.departmentId || null,
    },
  });
  await audit(me.id, "TEMPLATE_CREATED", "Template", null, { title: d.title });
  redirect(`${back}?ok=${encodeURIComponent("Textbaustein gespeichert.")}`);
}

export async function deleteTemplate(formData: FormData) {
  const me = await requireUser();
  const id = String(formData.get("id"));
  const back = me.role === "AZUBI" ? "/azubi/vorlagen" : "/admin/vorlagen";
  const where = me.role === "ADMIN" ? { id } : { id, ownerId: me.id };
  const del = await db.template.deleteMany({ where });
  if (!del.count) redirect(`${back}?error=${encodeURIComponent("Kein Zugriff.")}`);
  redirect(`${back}?ok=${encodeURIComponent("Textbaustein gelöscht.")}`);
}
