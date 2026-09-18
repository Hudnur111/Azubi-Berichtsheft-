/* Schnelltest der Demo-DB: zentrale Query-Muster der App gegen die In-Memory-Engine. */
import { createDemoDb } from "../src/lib/demo-db";
import { Prisma } from "@prisma/client";

async function main() {
  const db = createDemoDb();
  const assert = (cond: unknown, msg: string) => { if (!cond) throw new Error("FAIL: " + msg); console.log("ok  ", msg); };

  const admin = await db.user.findUnique({ where: { id: "demo-admin" }, select: { id: true, firstName: true, role: true, department: { select: { name: true } } } });
  assert(admin?.role === "ADMIN" && admin.department === null, "findUnique + select + null relation");

  const lena = await db.user.findFirst({ where: { username: { equals: "LENA.KRUEGER", mode: "insensitive" }, loginGroup: "AZUBI" } });
  assert(lena?.id === "demo-lena", "findFirst insensitive equals");

  const byCompound = await db.user.findUnique({ where: { username_loginGroup: { username: "admin", loginGroup: "STAFF" } } });
  assert(byCompound?.id === "demo-admin", "compound unique where");

  const reports = await db.report.findMany({ where: { azubiId: "demo-lena" }, orderBy: [{ year: "desc" }, { week: "desc" }], include: { department: { select: { name: true } }, _count: { select: { comments: true, attachments: true } } } });
  assert(reports.length > 90, `lena has ${reports.length} reports`);
  assert(reports[0].year >= reports[reports.length - 1].year, "orderBy desc");
  assert(typeof reports[0]._count.comments === "number", "_count in include");

  const rejected = await db.report.findFirst({ where: { azubiId: "demo-lena", status: "REJECTED" }, include: { entries: { orderBy: { sortOrder: "asc" } }, comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { firstName: true, role: true } } } }, reviewer: { select: { firstName: true } }, attachments: { omit: { data: true }, include: { uploadedBy: { select: { firstName: true } } } } } });
  assert(rejected && rejected.entries.length === 5 && rejected.comments.length === 2 && rejected.comments[0].author.firstName === "Petra" && rejected.reviewer?.firstName === "Petra", "nested include");
  assert(Prisma.Decimal.isDecimal(rejected!.entries[0].hours), "hours is Decimal");

  // Berechtigungs-Scope: Abteilungsleiter Vertrieb sieht Jonas (Stammabteilung) über rotations.some
  const now = new Date();
  const scoped = await db.user.findMany({ where: { role: "AZUBI", OR: [{ departmentId: "demo-dept-vtr" }, { rotations: { some: { departmentId: "demo-dept-vtr", startDate: { lte: now }, endDate: { gte: now } } } }] }, select: { id: true } });
  assert(scoped.some((u) => u.id === "demo-jonas") && !scoped.some((u) => u.id === "demo-lena"), "relation some filter");

  // reportScope über Relation azubi
  const petraScope = await db.report.count({ where: { status: "SUBMITTED", azubi: { role: "AZUBI", OR: [{ trainerId: "demo-petra" }, { departmentId: "demo-dept-it" }] } } });
  assert(petraScope >= 3, `petra sees ${petraScope} submitted reports`);

  const grouped = await db.report.groupBy({ by: ["departmentId"], where: { status: "SUBMITTED" }, _count: { _all: true } });
  assert(grouped.length >= 1 && grouped[0]._count._all >= 1, "groupBy");

  const agg = await db.reportEntry.aggregate({ where: { report: { azubiId: "demo-lena", status: "APPROVED" } }, _sum: { hours: true } });
  assert(Number(agg._sum.hours) > 1000, `aggregate sum hours = ${Number(agg._sum.hours)}`);

  const byCat = await db.reportEntry.groupBy({ by: ["category"], where: { report: { azubiId: "demo-lena", status: { in: ["APPROVED", "SUBMITTED"] } } }, _sum: { hours: true }, _count: { _all: true } });
  assert(byCat.some((c) => c.category === "BERUFSSCHULE"), "groupBy category");

  const search = await db.report.findMany({ where: { OR: [{ entries: { some: { description: { contains: "docker", mode: "insensitive" } } } }, { summary: { contains: "docker", mode: "insensitive" } }] }, take: 5 });
  assert(search.length > 0, "fulltext-ish search via entries.some contains");

  const contacts = await db.user.findMany({ where: { active: true, id: { not: "demo-lena" }, OR: [{ role: "ADMIN" }, { id: "demo-petra" }] }, orderBy: [{ role: "asc" }, { lastName: "asc" }], select: { id: true, role: true } });
  assert(contacts[0].role === "ADMIN" && contacts.length === 2, "enum order + not filter");

  const unread = await db.message.groupBy({ by: ["senderId"], where: { recipientId: "demo-lena", readAt: null }, _count: { _all: true } });
  assert(unread.length === 1 && unread[0].senderId === "demo-petra", "null filter + groupBy");

  // Schreiben: Bericht anlegen mit nested create, update mit increment, transaction, delete cascade
  const created = await db.report.create({ data: { azubiId: "demo-lena", type: "WEEKLY", year: 2030, week: 1, day: 0, weekStart: new Date(2030, 0, 1), weekEnd: new Date(2030, 0, 6), departmentId: null, entries: { create: [{ date: new Date(2030, 0, 1), sortOrder: 0, hours: 8 }, { date: new Date(2030, 0, 2), sortOrder: 1, hours: 0, category: "FEIERTAG", description: "Test" }] } } });
  const withEntries = await db.report.findUnique({ where: { azubiId_year_week_day: { azubiId: "demo-lena", year: 2030, week: 1, day: 0 } }, include: { entries: true } });
  assert(withEntries?.entries.length === 2 && Prisma.Decimal.isDecimal(withEntries.entries[0].hours), "nested create + coerce Decimal");
  await db.$transaction([
    db.report.update({ where: { id: created.id }, data: { status: "REJECTED", version: { increment: 1 } } }),
    db.comment.create({ data: { reportId: created.id, authorId: "demo-petra", text: "x" } }),
  ]);
  const after = await db.report.findUnique({ where: { id: created.id }, include: { _count: { select: { comments: true } } } });
  assert(after?.version === 2 && after.status === "REJECTED" && after._count.comments === 1, "transaction + increment");
  const del = await db.report.delete({ where: { id: created.id } });
  assert(del.id === created.id && (await db.reportEntry.count({ where: { reportId: created.id } })) === 0 && (await db.comment.count({ where: { reportId: created.id } })) === 0, "delete cascade");

  // Unique-Verletzung
  let threw = false;
  try { await db.department.create({ data: { name: "Vertrieb", code: "XX" } }); } catch (e) { threw = (e as { code?: string }).code === "P2002"; }
  assert(threw, "unique constraint P2002");

  // updateMany / deleteMany / upsert
  const um = await db.notification.updateMany({ where: { userId: "demo-lena", read: false }, data: { read: true } });
  assert(um.count === 1 && (await db.notification.count({ where: { userId: "demo-lena", read: false } })) === 0, "updateMany");
  await db.appSetting.upsert({ where: { id: "default" }, update: { companyName: "Neu GmbH" }, create: { id: "default", companyName: "Neu GmbH" } });
  assert((await db.appSetting.findUnique({ where: { id: "default" } }))?.companyName === "Neu GmbH", "upsert update");
  const tpl = await db.template.deleteMany({ where: { id: "nope", ownerId: "demo-lena" } });
  assert(tpl.count === 0, "deleteMany none");

  // Json-Pfad-Filter (Login-Sperre)
  await db.auditLog.create({ data: { actorId: null, action: "LOGIN_FAILED", targetType: "User", details: { login: "foo" } } });
  const failed = await db.auditLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: new Date(Date.now() - 60000) }, details: { path: ["login"], equals: "foo" } } });
  assert(failed === 1, "json path filter");

  // Department löschen → SetNull bei Usern, Cascade bei Rotationen
  await db.department.delete({ where: { id: "demo-dept-hr" } });
  assert((await db.rotation.count({ where: { departmentId: "demo-dept-hr" } })) === 0, "department delete cascades rotations");

  // Azubi löschen → Berichte weg, Trainer-Verweise bleiben
  await db.user.delete({ where: { id: "demo-max" } });
  assert((await db.report.count({ where: { azubiId: "demo-max" } })) === 0 && (await db.message.count({ where: { OR: [{ senderId: "demo-max" }, { recipientId: "demo-max" }] } })) === 0, "user delete cascades");

  const az = await db.user.findMany({ where: { role: "AZUBI", active: true }, select: { id: true, reports: { select: { year: true, week: true, day: true, status: true } } } });
  assert(az.every((a) => Array.isArray(a.reports)), "select many relation");

  const jonasDaily = await db.report.findMany({ where: { azubiId: "demo-jonas" }, orderBy: [{ year: "desc" }, { week: "desc" }, { day: "desc" }], take: 3 });
  assert(jonasDaily.length === 3 && jonasDaily[0].type === "DAILY" && jonasDaily[0].status === "DRAFT", "daily reports");

  const paged = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: 2, take: 3, include: { actor: { select: { firstName: true } } } });
  assert(paged.length === 3, "skip/take");

  console.log("\nAlle Engine-Tests bestanden.");
}

main().catch((e) => { console.error(e); process.exit(1); });
