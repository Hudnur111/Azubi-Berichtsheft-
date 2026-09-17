/* Seed: Admin-Account + optionale Demo-Daten. Aufruf: npm run db:seed */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek, subWeeks } from "date-fns";

const db = new PrismaClient();
const hash = (p: string) => bcrypt.hash(p, 12);

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: await hash(adminPassword), firstName: "System", lastName: "Admin", role: "ADMIN", mustChangePassword: true },
  });
  console.log(`✔ Admin: ${admin.email}`);

  if ((process.env.SEED_DEMO ?? "true") !== "true") return;
  if (await db.department.count()) { console.log("Demo-Daten existieren bereits – übersprungen."); return; }

  const [it, vertrieb, buchhaltung] = await Promise.all([
    db.department.create({ data: { name: "IT & Digitalisierung", code: "IT", description: "Softwareentwicklung, Support, Infrastruktur" } }),
    db.department.create({ data: { name: "Vertrieb", code: "VTR", description: "Kundenberatung und Auftragsabwicklung" } }),
    db.department.create({ data: { name: "Buchhaltung", code: "BUH", description: "Finanzen und Controlling" } }),
  ]);
  const demoPw = await hash("Demo123!");
  const ausbilder = await db.user.create({ data: { email: "ausbilder@example.com", passwordHash: demoPw, firstName: "Petra", lastName: "Meier", role: "AUSBILDER", departmentId: it.id } });
  await db.user.create({ data: { email: "leitung.vertrieb@example.com", passwordHash: demoPw, firstName: "Thomas", lastName: "Schulz", role: "ABTEILUNGSLEITER", departmentId: vertrieb.id } });
  const beginn = new Date(new Date().getFullYear() - 1, 7, 1);
  const azubi1 = await db.user.create({ data: { email: "azubi@example.com", passwordHash: demoPw, firstName: "Lena", lastName: "Krüger", role: "AZUBI", departmentId: it.id, trainerId: ausbilder.id, beruf: "Fachinformatiker/in Anwendungsentwicklung", ausbildungsjahr: 2, berichtsheftTyp: "WEEKLY", ausbildungsbeginn: beginn, ausbildungsende: addDays(beginn, 365 * 3) } });
  const azubi2 = await db.user.create({ data: { email: "azubi2@example.com", passwordHash: demoPw, firstName: "Jonas", lastName: "Weber", role: "AZUBI", departmentId: vertrieb.id, trainerId: ausbilder.id, beruf: "Kaufmann/-frau für Büromanagement", ausbildungsjahr: 1, ausbildungsbeginn: new Date(new Date().getFullYear(), 7, 1) } });

  await db.rotation.createMany({ data: [
    { azubiId: azubi1.id, departmentId: it.id, startDate: subWeeks(new Date(), 20), endDate: subWeeks(new Date(), 4) },
    { azubiId: azubi1.id, departmentId: buchhaltung.id, startDate: subWeeks(new Date(), 4), endDate: addDays(new Date(), 60), note: "Einsatz Jahresabschluss" },
  ] });

  await db.template.createMany({ data: [
    { title: "Daily Standup", content: "Teilnahme am täglichen Standup, Abstimmung der Aufgaben im Team.", category: "BETRIEB", isGlobal: true },
    { title: "Berufsschule", content: "Unterricht in den Fächern: Anwendungsentwicklung, Wirtschaft, Englisch.", category: "BERUFSSCHULE", isGlobal: true },
    { title: "Ticketbearbeitung", content: "Bearbeitung von Support-Tickets im Helpdesk, Dokumentation der Lösungen.", category: "BETRIEB", departmentId: it.id },
  ] });

  const texts = [
    "Einarbeitung in das Projekt-Repository, Code-Review mit Ausbilderin.",
    "Implementierung eines REST-Endpunkts inkl. Unit-Tests.",
    "Fehleranalyse im Ticketsystem, Dokumentation im Wiki.",
    "Berufsschule: Datenbanken (SQL-Joins), Wirtschaftslehre.",
    "Refactoring bestehender Komponenten, Abstimmung im Team-Meeting.",
  ];
  const statuses = ["APPROVED", "APPROVED", "APPROVED", "REJECTED", "SUBMITTED", "DRAFT"] as const;
  for (let i = statuses.length; i >= 1; i--) {
    const wk = subWeeks(new Date(), i);
    const start = startOfISOWeek(wk);
    const status = statuses[statuses.length - i];
    const r = await db.report.create({
      data: {
        azubiId: azubi1.id, year: getISOWeekYear(wk), week: getISOWeek(wk), weekStart: start, weekEnd: endOfISOWeek(wk), status,
        departmentId: i > 4 ? it.id : buchhaltung.id, ausbildungsjahr: 2,
        submittedAt: status === "DRAFT" ? null : addDays(start, 5), reviewedAt: status === "APPROVED" || status === "REJECTED" ? addDays(start, 6) : null,
        reviewerId: status === "APPROVED" || status === "REJECTED" ? ausbilder.id : null,
        reviewNote: status === "REJECTED" ? "Bitte die Tätigkeiten am Mittwoch konkreter beschreiben." : null,
        entries: { create: Array.from({ length: 5 }, (_, d) => ({ date: addDays(start, d), sortOrder: d, category: d === 3 ? "BERUFSSCHULE" : "BETRIEB", description: status === "DRAFT" && d > 2 ? "" : texts[d], hours: new Prisma.Decimal(8) })) },
      },
    });
    if (status === "REJECTED") await db.comment.create({ data: { reportId: r.id, authorId: ausbilder.id, text: "Rückgabe: Bitte die Tätigkeiten am Mittwoch konkreter beschreiben." } });
  }
  await db.notification.create({ data: { userId: azubi1.id, title: "Willkommen im Berichtsheft", message: "Dein Account ist eingerichtet. Viel Erfolg in der Ausbildung!" } });
  await db.auditLog.create({ data: { actorId: admin.id, action: "SEED", targetType: "System", details: { demo: true } } });
  console.log(`✔ Demo: ausbilder@example.com / azubi@example.com / azubi2@example.com / leitung.vertrieb@example.com (Passwort: Demo123!) – ${azubi2.email}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
