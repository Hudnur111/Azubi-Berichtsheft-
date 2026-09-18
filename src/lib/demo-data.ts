/**
 * Demo-Daten für den Demo-Modus (siehe demo-db.ts).
 * Alle Zeiträume sind relativ zum aktuellen Datum, damit die Demo immer „aktuell“ aussieht.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcryptjs";
import {
  addDays, eachDayOfInterval, endOfISOWeek, format, getISODay, getISOWeek, getISOWeekYear, isWeekend, set, startOfDay, startOfISOWeek, subDays, subWeeks,
} from "date-fns";
import { holidayMap } from "./holidays";
import { ausbildungsjahrAt } from "./dates";
import { DEMO_PASSWORD } from "./demo-mode";
import type { ModelName } from "./demo-db";

type Rec = Record<string, any>;
type Insert = (model: ModelName, data: Rec) => Rec;

export type DemoAccount = { id: string; username: string; name: string; role: "ADMIN" | "AUSBILDER" | "ABTEILUNGSLEITER" | "AZUBI"; group: "STAFF" | "AZUBI"; hint: string };

/** Konten, die auf der Login-Seite per Klick verfügbar sind. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "demo-admin", username: "admin", name: "Sabine Hoffmann", role: "ADMIN", group: "STAFF", hint: "Vollzugriff: Benutzer, Abteilungen, Einstellungen, Audit-Log" },
  { id: "demo-petra", username: "petra.meier", name: "Petra Meier", role: "AUSBILDER", group: "STAFF", hint: "Ausbilderin IT – prüft Berichte ihrer Azubis" },
  { id: "demo-thomas", username: "thomas.schulz", name: "Thomas Schulz", role: "ABTEILUNGSLEITER", group: "STAFF", hint: "Leitung Vertrieb – sieht Azubis mit Einsatz im Vertrieb" },
  { id: "demo-lena", username: "lena.krueger", name: "Lena Krüger", role: "AZUBI", group: "AZUBI", hint: "Wochenberichte · 3. Ausbildungsjahr · Fachinformatikerin" },
  { id: "demo-jonas", username: "jonas.weber", name: "Jonas Weber", role: "AZUBI", group: "AZUBI", hint: "Tagesberichte · 2. Ausbildungsjahr · Büromanagement" },
  { id: "demo-max", username: "max.becker", name: "Max Becker", role: "AZUBI", group: "AZUBI", hint: "Wochenberichte mit Rückstand · Industriekaufmann" },
];

export const DEMO_INVITE_CODE = "DEMO2026";

/* ---------- Textbausteine für generierte Einträge ---------- */

const TEXT_IT = [
  "Einarbeitung in das Projekt-Repository, Code-Review mit der Ausbilderin.",
  "Implementierung eines REST-Endpunkts inkl. Unit-Tests (Jest).",
  "Fehleranalyse im Ticketsystem, Dokumentation der Lösung im Wiki.",
  "Refactoring der Login-Komponente, Abstimmung im Team-Meeting.",
  "Datenbankabfragen optimiert (Indizes), Ergebnisse im Daily vorgestellt.",
  "Support-Tickets bearbeitet: Druckerinstallation, VPN-Zugang, Passwort-Resets.",
  "Aufbau einer Testumgebung mit Docker, Einführung in CI/CD-Pipelines.",
  "Frontend-Komponente für die Kundenübersicht erstellt (React, Tailwind).",
  "Sicherheitsupdates auf den Entwicklungsservern eingespielt und dokumentiert.",
  "Sprint-Planning: User Stories geschätzt, Aufgaben im Board angelegt.",
  "Schnittstelle zum ERP-System getestet, Fehlerfälle dokumentiert.",
  "Pair Programming: Validierung von Formulareingaben umgesetzt.",
  "Automatisierte Tests für den Warenkorb geschrieben, Testabdeckung erhöht.",
  "Kundenanfrage analysiert und Lösungsvorschlag im Ticket dokumentiert.",
];
const TEXT_BUH = [
  "Eingangsrechnungen geprüft und kontiert (Kreditorenbuchhaltung).",
  "Zahlungsläufe vorbereitet, offene Posten mit dem Vertrieb abgestimmt.",
  "Monatsabschluss: Abgrenzungen gebucht, Kontenabstimmung durchgeführt.",
  "Reisekostenabrechnungen geprüft und im System erfasst.",
  "Mahnwesen: Mahnlauf erstellt, Rückfragen von Kunden beantwortet.",
  "Anlagenbuchhaltung: Neuzugänge erfasst, Abschreibungen geprüft.",
  "Umsatzsteuer-Voranmeldung vorbereitet, Belege digital abgelegt.",
  "Kostenstellenauswertung für die Geschäftsleitung erstellt (Excel).",
  "Bankbuchungen verarbeitet, Differenzen geklärt.",
  "Einführung in das Controlling: Soll-Ist-Vergleich für Q3 vorbereitet.",
];
const TEXT_VTR = [
  "Angebote für Bestandskunden erstellt und im CRM dokumentiert.",
  "Telefonische Kundenberatung, Auftragserfassung im ERP-System.",
  "Vorbereitung der Messeunterlagen, Abstimmung mit dem Marketing.",
  "Reklamationsbearbeitung: Rücksprache mit Lager und Kunde.",
  "Auftragsbestätigungen versendet, Liefertermine nachverfolgt.",
  "Kundenstammdaten gepflegt, Dublettenprüfung durchgeführt.",
  "Teilnahme am Vertriebsmeeting, Protokoll geschrieben.",
  "Preislisten aktualisiert, Freigabe mit der Abteilungsleitung.",
  "Kundentermin begleitet: Bedarfsanalyse und Angebotsnachbereitung.",
  "Rechnungen erstellt und mit der Buchhaltung abgestimmt.",
  "Neukundenrecherche für die Region Süd, Kontaktliste angelegt.",
];
const TEXT_HR = [
  "Bewerbungsunterlagen gesichtet, Einladungen zu Vorstellungsgesprächen versendet.",
  "Onboarding-Unterlagen für neue Mitarbeitende vorbereitet.",
  "Zeiterfassung geprüft, Urlaubsanträge bearbeitet.",
  "Stellenanzeige für Ausbildungsplätze 2027 formuliert.",
];
const SCHOOL_IT = [
  "Berufsschule: Anwendungsentwicklung (Datenbanken, SQL-Joins), Wirtschafts- und Sozialkunde.",
  "Berufsschule: IT-Systeme (Netzwerke, Subnetting), Englisch.",
  "Berufsschule: Programmierung (Objektorientierung in Java), Deutsch.",
  "Berufsschule: Projektmanagement, Datenschutz und IT-Sicherheit.",
];
const SCHOOL_KFM = [
  "Berufsschule: Büroprozesse, Rechnungswesen, Englisch.",
  "Berufsschule: Wirtschaftslehre, Textverarbeitung, Deutsch.",
  "Berufsschule: Kaufmännische Steuerung und Kontrolle, Sozialkunde.",
];
const SEMINARS = ["Seminar: Datenschutz-Grundschulung (DSGVO) im Haus.", "Schulung: Präsentationstechniken für Auszubildende.", "Workshop: Zeitmanagement und Selbstorganisation."];

/* ---------- Hilfsfunktionen ---------- */

const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const pick = <T,>(pool: T[], key: string) => pool[hash(key) % pool.length];
const at = (d: Date, h: number, m = 0) => set(d, { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
const isoKey = (d: Date) => format(d, "yyyy-MM-dd");

function isVacation(d: Date) {
  const m = d.getMonth(), day = d.getDate();
  return (m === 7 && day >= 3 && day <= 16) || (m === 11 && day >= 24) || (m === 0 && day <= 2); // Sommer + Weihnachten
}

/* ---------- Seed ---------- */

export function seedDemoData(insert: Insert) {
  const now = new Date();
  const today = startOfDay(now);
  const year = now.getFullYear();
  const holidays = holidayMap([year - 3, year - 2, year - 1, year, year + 1], "BW");
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 6);
  const oldest = subWeeks(now, 110);

  /* Einstellungen */
  insert("appSetting", {
    id: "default",
    companyName: "Muster GmbH",
    bundesland: "BW",
    supportEmail: "ausbildung@muster-gmbh.de",
    impressum: "Muster GmbH\nMusterstraße 12\n70173 Stuttgart\n\nVertreten durch: Dr. Anna Beispiel (Geschäftsführung)\nTelefon: 0711 123456-0\nE-Mail: info@muster-gmbh.de\n\nRegistergericht: Amtsgericht Stuttgart, HRB 000000\nUSt-IdNr.: DE000000000\n\nHinweis: Dies ist eine Demo-Installation mit fiktiven Daten.",
    datenschutz: "Verantwortlich für die Datenverarbeitung ist die Muster GmbH (siehe Impressum).\n\nZweck: Führung des Ausbildungsnachweises nach § 13 BBiG. Verarbeitet werden Name, Benutzername, E-Mail, Ausbildungsdaten sowie die Inhalte der Berichte, Kommentare und Chat-Nachrichten.\n\nSpeicherdauer: bis zum Ende der Ausbildung zzgl. gesetzlicher Aufbewahrungsfristen.\n\nRechte: Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Datenübertragbarkeit sowie Beschwerde bei der Aufsichtsbehörde.\n\nHinweis: Dies ist eine Demo-Installation. Es werden keine echten personenbezogenen Daten verarbeitet.",
    updatedAt: subDays(now, 12),
  });

  /* Abteilungen */
  const it = insert("department", { id: "demo-dept-it", name: "IT & Digitalisierung", code: "IT", description: "Softwareentwicklung, Support, Infrastruktur", createdAt: oldest });
  const vtr = insert("department", { id: "demo-dept-vtr", name: "Vertrieb", code: "VTR", description: "Kundenberatung, Angebote und Auftragsabwicklung", createdAt: oldest });
  const buh = insert("department", { id: "demo-dept-buh", name: "Buchhaltung", code: "BUH", description: "Finanzen, Controlling und Rechnungswesen", createdAt: oldest });
  const hr = insert("department", { id: "demo-dept-hr", name: "Personal", code: "HR", description: "Personalverwaltung und Recruiting", createdAt: subWeeks(now, 30) });
  const deptText: Record<string, string[]> = { [it.id]: TEXT_IT, [vtr.id]: TEXT_VTR, [buh.id]: TEXT_BUH, [hr.id]: TEXT_HR };

  /* Nutzer – Ausbildung */
  const staffBase = { loginGroup: "STAFF", passwordHash, createdAt: oldest, registeredAt: oldest };
  const admin = insert("user", { id: "demo-admin", username: "admin", email: "admin@muster-gmbh.de", firstName: "Sabine", lastName: "Hoffmann", role: "ADMIN", lastLoginAt: at(now, 8, 5), ...staffBase });
  const petra = insert("user", { id: "demo-petra", username: "petra.meier", email: "petra.meier@muster-gmbh.de", firstName: "Petra", lastName: "Meier", role: "AUSBILDER", departmentId: it.id, lastLoginAt: at(subDays(now, 1), 16, 40), ...staffBase });
  const thomas = insert("user", { id: "demo-thomas", username: "thomas.schulz", email: "thomas.schulz@muster-gmbh.de", firstName: "Thomas", lastName: "Schulz", role: "ABTEILUNGSLEITER", departmentId: vtr.id, lastLoginAt: at(subDays(now, 2), 9, 10), ...staffBase });
  const karin = insert("user", { id: "demo-karin", username: "karin.vogel", email: "karin.vogel@muster-gmbh.de", firstName: "Karin", lastName: "Vogel", role: "AUSBILDER", departmentId: buh.id, lastLoginAt: at(subDays(now, 3), 11, 25), ...staffBase });

  /* Nutzer – Azubis */
  const lenaBegin = new Date(year - 2, 8, 1);
  const jonasBegin = new Date(year - 1, 8, 1);
  const maxBegin = new Date(year - 1, 8, 1);
  const lena = insert("user", {
    id: "demo-lena", username: "lena.krueger", loginGroup: "AZUBI", email: "lena.krueger@muster-gmbh.de", passwordHash, firstName: "Lena", lastName: "Krüger", role: "AZUBI",
    departmentId: it.id, trainerId: petra.id, beruf: "Fachinformatiker/in Anwendungsentwicklung", ausbildungsjahr: ausbildungsjahrAt(lenaBegin), ausbildungsbeginn: lenaBegin, ausbildungsende: new Date(year + 1, 7, 31),
    berichtsheftTyp: "WEEKLY", invitedById: petra.id, registeredAt: lenaBegin, createdAt: subDays(lenaBegin, 10), lastLoginAt: at(now, 7, 50),
  });
  const jonas = insert("user", {
    id: "demo-jonas", username: "jonas.weber", loginGroup: "AZUBI", email: "jonas.weber@muster-gmbh.de", passwordHash, firstName: "Jonas", lastName: "Weber", role: "AZUBI",
    departmentId: vtr.id, trainerId: petra.id, beruf: "Kaufmann/-frau für Büromanagement", ausbildungsjahr: ausbildungsjahrAt(jonasBegin), ausbildungsbeginn: jonasBegin, ausbildungsende: new Date(year + 2, 7, 31),
    berichtsheftTyp: "DAILY", invitedById: admin.id, registeredAt: jonasBegin, createdAt: subDays(jonasBegin, 14), lastLoginAt: at(subDays(now, 1), 17, 5),
  });
  const max = insert("user", {
    id: "demo-max", username: "max.becker", loginGroup: "AZUBI", email: "max.becker@muster-gmbh.de", passwordHash, firstName: "Max", lastName: "Becker", role: "AZUBI",
    departmentId: buh.id, trainerId: karin.id, beruf: "Industriekaufmann/-frau", ausbildungsjahr: ausbildungsjahrAt(maxBegin), ausbildungsbeginn: maxBegin, ausbildungsende: new Date(year + 2, 7, 31),
    berichtsheftTyp: "WEEKLY", invitedById: admin.id, registeredAt: maxBegin, createdAt: subDays(maxBegin, 14), lastLoginAt: at(subDays(now, 6), 12, 30),
  });
  insert("user", {
    id: "demo-mia", username: "mia.schmidt", loginGroup: "AZUBI", email: null, passwordHash: "", firstName: "Mia", lastName: "Schmidt", role: "AZUBI",
    departmentId: vtr.id, trainerId: thomas.id, beruf: "Kaufmann/-frau im Einzelhandel", ausbildungsbeginn: new Date(year, 9, 1), inviteCode: DEMO_INVITE_CODE, invitedById: petra.id, createdAt: subDays(now, 4),
  });
  insert("user", {
    id: "demo-tim", username: "tim.lang", loginGroup: "AZUBI", email: "tim.lang@example.com", passwordHash, firstName: "Tim", lastName: "Lang", role: "AZUBI", active: false,
    departmentId: it.id, trainerId: petra.id, beruf: "Fachinformatiker/in Systemintegration", ausbildungsjahr: 3, ausbildungsbeginn: new Date(year - 3, 8, 1), ausbildungsende: new Date(year, 5, 30),
    berichtsheftTyp: "WEEKLY", registeredAt: new Date(year - 3, 8, 1), createdAt: new Date(year - 3, 7, 20), lastLoginAt: new Date(year, 5, 28),
  });

  /* Durchlaufplan */
  const rot = (azubiId: string, departmentId: string, startDate: Date, endDate: Date, note?: string) =>
    insert("rotation", { azubiId, departmentId, startDate: startOfDay(startDate), endDate: startOfDay(endDate), note: note ?? null, createdAt: subDays(startDate, 21) });
  rot(lena.id, it.id, lenaBegin, subWeeks(today, 8));
  rot(lena.id, buh.id, addDays(subWeeks(today, 8), 1), addDays(today, 41), "Einsatz Jahresabschluss");
  rot(lena.id, hr.id, addDays(today, 42), addDays(today, 98), "Einführung Personalprozesse");
  rot(jonas.id, vtr.id, jonasBegin, addDays(today, 20));
  rot(jonas.id, hr.id, addDays(today, 21), addDays(today, 80));
  rot(max.id, buh.id, maxBegin, addDays(today, 60));

  const deptAt = (azubiId: string, fallback: string, d: Date) => {
    const map: Record<string, [Date, Date, string][]> = {
      [lena.id]: [[lenaBegin, subWeeks(today, 8), it.id], [addDays(subWeeks(today, 8), 1), addDays(today, 41), buh.id]],
      [jonas.id]: [[jonasBegin, addDays(today, 20), vtr.id]],
      [max.id]: [[maxBegin, addDays(today, 60), buh.id]],
    };
    return map[azubiId]?.find(([s, e]) => d >= s && d <= e)?.[2] ?? fallback;
  };

  /* Textbausteine */
  insert("template", { title: "Daily Standup", content: "Teilnahme am täglichen Standup, Abstimmung der Aufgaben im Team.", category: "BETRIEB", isGlobal: true, createdAt: oldest });
  insert("template", { title: "Berufsschule", content: "Unterricht in den Fächern: Anwendungsentwicklung, Wirtschafts- und Sozialkunde, Englisch.", category: "BERUFSSCHULE", isGlobal: true, createdAt: oldest });
  insert("template", { title: "Datenschutzschulung", content: "Teilnahme an der jährlichen Datenschutz-Grundschulung (DSGVO).", category: "SEMINAR", isGlobal: true, createdAt: subWeeks(now, 40) });
  insert("template", { title: "Ticketbearbeitung", content: "Bearbeitung von Support-Tickets im Helpdesk, Dokumentation der Lösungen im Wiki.", category: "BETRIEB", departmentId: it.id, ownerId: petra.id, createdAt: subWeeks(now, 60) });
  insert("template", { title: "Code-Review", content: "Review eines Pull Requests: Lesbarkeit, Tests und Fehlerbehandlung geprüft, Feedback im Repository hinterlassen.", category: "BETRIEB", departmentId: it.id, ownerId: petra.id, createdAt: subWeeks(now, 20) });
  insert("template", { title: "Rechnungsprüfung", content: "Eingangsrechnungen sachlich und rechnerisch geprüft, Kontierung vorgenommen.", category: "BETRIEB", departmentId: buh.id, ownerId: karin.id, createdAt: subWeeks(now, 30) });
  insert("template", { title: "Kundenanfrage", content: "Kundenanfrage telefonisch aufgenommen, Angebot im CRM erstellt und versendet.", category: "BETRIEB", departmentId: vtr.id, ownerId: thomas.id, createdAt: subWeeks(now, 25) });
  insert("template", { title: "Sprint-Review", content: "Sprint-Review mit dem Team: Ergebnisse vorgestellt, Feedback aufgenommen, nächste Schritte notiert.", category: "BETRIEB", ownerId: lena.id, createdAt: subWeeks(now, 6) });

  /* ---------- Berichte ---------- */

  type EntryPlan = { date: Date; category: string; description: string; hours: number };

  function planEntry(azubiId: string, deptId: string, d: Date, schoolDays: number[], school: string[], fallbackText: string[], sick: boolean): EntryPlan {
    const key = `${azubiId}-${isoKey(d)}`;
    const h = holidays.get(isoKey(d));
    if (h) return { date: d, category: "FEIERTAG", description: h, hours: 0 };
    if (isVacation(d)) return { date: d, category: "URLAUB", description: "Jahresurlaub", hours: 0 };
    if (sick) return { date: d, category: "KRANK", description: "Krankmeldung (AU liegt vor)", hours: 0 };
    if (schoolDays.includes(getISODay(d))) return { date: d, category: "BERUFSSCHULE", description: pick(school, key), hours: 8 };
    if (hash(key + "s") % 23 === 0) return { date: d, category: "SEMINAR", description: pick(SEMINARS, key), hours: 7 };
    const hours = [8, 8, 8, 7.5, 8.5][hash(key + "h") % 5];
    return { date: d, category: "BETRIEB", description: pick(deptText[deptId] ?? fallbackText, key), hours };
  }

  function createReport(data: Rec, entries: EntryPlan[]) {
    return insert("report", { ...data, entries: { create: entries.map((e, i) => ({ date: e.date, category: e.category, description: e.description, hours: e.hours, sortOrder: i })) } });
  }

  const reviewedBy = (trainerId: string, weekEnd: Date, status: string, note?: string) =>
    status === "APPROVED" || status === "REJECTED" ? { reviewerId: trainerId, reviewedAt: at(addDays(weekEnd, 1), 10, 15), reviewNote: note ?? null } : { reviewerId: null, reviewedAt: null, reviewNote: null };

  const cw = { year: getISOWeekYear(now), week: getISOWeek(now) };
  const lenaReports: Rec[] = [];
  const maxReports: Rec[] = [];

  /** Wochenberichte von Ausbildungsbeginn bis heute. */
  function weeklyReports(azubi: Rec, trainerId: string, schoolDays: number[], school: string[], fallbackText: string[], plan: (weeksAgo: number) => { status: string; skip?: boolean; note?: string; submittedDaysAgo?: number } , out: Rec[]) {
    const first = startOfISOWeek(azubi.ausbildungsbeginn);
    const current = startOfISOWeek(now);
    for (let start = first; start <= current; start = addDays(start, 7)) {
      const weeksAgo = Math.round((current.getTime() - start.getTime()) / (7 * 86400000));
      const p = plan(weeksAgo);
      if (p.skip) continue;
      const end = endOfISOWeek(start);
      const workdays = eachDayOfInterval({ start, end: addDays(start, 4) });
      const deptId = deptAt(azubi.id, azubi.departmentId, start);
      const sickDay = hash(`${azubi.id}-${isoKey(start)}-k`) % 19 === 0 ? 2 + (hash(isoKey(start)) % 3) : -1;
      let entries = workdays.map((d, i) => planEntry(azubi.id, deptId, d, schoolDays, school, fallbackText, i === sickDay));
      const isCurrent = weeksAgo === 0;
      if (isCurrent) entries = entries.map((e, i) => (i < getISODay(now) - 1 ? e : { ...e, description: "", hours: 8, category: "BETRIEB" }));
      const status = p.status;
      const submittedAt = status === "DRAFT" ? null : p.submittedDaysAgo != null ? at(subDays(now, p.submittedDaysAgo), 16, 20) : at(addDays(start, 4), 16, 20);
      const rejectedBefore = weeksAgo === 9 || weeksAgo === 21;
      const rec = createReport({
        azubiId: azubi.id, type: "WEEKLY", year: getISOWeekYear(start), week: getISOWeek(start), day: 0, weekStart: start, weekEnd: end, status,
        departmentId: deptId, ausbildungsjahr: ausbildungsjahrAt(azubi.ausbildungsbeginn, start), submittedAt,
        summary: weeksAgo <= 12 && status !== "DRAFT" ? `Schwerpunkt der Woche: ${entries.find((e) => e.category === "BETRIEB")?.description.replace(/\.$/, "") ?? "Regelbetrieb"}.` : null,
        version: rejectedBefore && status === "APPROVED" ? 2 : 1,
        createdAt: at(start, 8, 30), updatedAt: submittedAt ?? at(now, 9, 0),
        ...reviewedBy(trainerId, end, status, p.note),
      }, entries);
      out.push(rec);
    }
  }

  // Lena: aktuelle Woche Entwurf, 2 Wochen eingereicht, 1 zurückgegeben, 1 Woche fehlt, Rest genehmigt
  weeklyReports(lena, petra.id, [2], SCHOOL_IT, TEXT_IT, (w) => {
    if (w === 0) return { status: "DRAFT" };
    if (w === 1 || w === 2) return { status: "SUBMITTED", submittedDaysAgo: w === 1 ? 3 : 10 };
    if (w === 3) return { status: "REJECTED", note: "Bitte die Tätigkeiten am Mittwoch konkreter beschreiben (welches Ticket, welches Ergebnis?)." };
    if (w === 5) return { status: "DRAFT", skip: true };
    return { status: "APPROVED" };
  }, lenaReports);

  // Max: mehrere Wochen fehlen (Rückstand), ein Bericht wartet seit 9 Tagen auf Prüfung
  weeklyReports(max, karin.id, [1, 4], SCHOOL_KFM, TEXT_BUH, (w) => {
    if (w === 0 || w === 1 || w === 2 || w === 3) return { status: "DRAFT", skip: true };
    if (w === 4) return { status: "SUBMITTED", submittedDaysAgo: 9 };
    if (w === 5) return { status: "DRAFT" };
    return { status: "APPROVED" };
  }, maxReports);

  // Jonas: Tagesberichte
  const jonasReports: Rec[] = [];
  {
    const days = eachDayOfInterval({ start: startOfDay(jonas.ausbildungsbeginn), end: today }).filter((d) => !isWeekend(d) && !holidays.has(isoKey(d)));
    days.forEach((d, idx) => {
      const daysAgo = days.length - 1 - idx;
      if (daysAgo === 5 || daysAgo === 11) return; // fehlende Tage
      const status = daysAgo === 0 ? "DRAFT" : daysAgo === 1 || daysAgo === 2 ? "SUBMITTED" : daysAgo === 7 ? "REJECTED" : "APPROVED";
      const deptId = deptAt(jonas.id, jonas.departmentId, d);
      const entry = planEntry(jonas.id, deptId, d, [3], SCHOOL_KFM, TEXT_VTR, hash(`${jonas.id}-${isoKey(d)}-k`) % 41 === 0);
      const submittedAt = status === "DRAFT" ? null : at(d, 17, 5);
      const rec = createReport({
        azubiId: jonas.id, type: "DAILY", year: getISOWeekYear(d), week: getISOWeek(d), day: getISODay(d), weekStart: d, weekEnd: d, status,
        departmentId: deptId, ausbildungsjahr: ausbildungsjahrAt(jonas.ausbildungsbeginn, d), submittedAt,
        createdAt: at(d, 16, 45), updatedAt: submittedAt ?? at(now, 9, 0),
        ...reviewedBy(petra.id, d, status, status === "REJECTED" ? "Stundenangabe fehlt – bitte ergänzen und die Kundentermine einzeln aufführen." : undefined),
      }, [status === "DRAFT" ? { ...entry, description: "" } : entry]);
      jonasReports.push(rec);
    });
  }

  /* Kommentare */
  const lenaRejected = lenaReports.find((r) => r.status === "REJECTED")!;
  const lenaSubmitted = lenaReports.filter((r) => r.status === "SUBMITTED").sort((a, b) => a.submittedAt - b.submittedAt);
  insert("comment", { reportId: lenaRejected.id, authorId: petra.id, text: `Rückgabe: ${lenaRejected.reviewNote}`, createdAt: lenaRejected.reviewedAt });
  insert("comment", { reportId: lenaRejected.id, authorId: lena.id, text: "Danke für den Hinweis – ich ergänze die Ticketnummern und das Ergebnis heute noch.", createdAt: at(addDays(lenaRejected.reviewedAt, 0), 14, 2) });
  insert("comment", { reportId: lenaSubmitted[0].id, authorId: lena.id, text: "Am Donnerstag war ich beim Kundentermin dabei – ich habe es unter Betrieb eingetragen.", createdAt: at(subDays(now, 9), 9, 40) });
  insert("comment", { reportId: lenaSubmitted[0].id, authorId: petra.id, text: "Passt so. Bitte künftig den Kundennamen weglassen (Datenschutz).", createdAt: at(subDays(now, 8), 8, 55) });
  const jonasRejected = jonasReports.find((r) => r.status === "REJECTED")!;
  insert("comment", { reportId: jonasRejected.id, authorId: petra.id, text: `Rückgabe: ${jonasRejected.reviewNote}`, createdAt: jonasRejected.reviewedAt });
  const maxSubmitted = maxReports.find((r) => r.status === "SUBMITTED")!;
  insert("comment", { reportId: maxSubmitted.id, authorId: max.id, text: "Entschuldigung für die Verspätung – die restlichen Wochen folgen bis Freitag.", createdAt: maxSubmitted.submittedAt });

  /* Anhang (Beispiel) */
  const notes = Buffer.from("Sprint-Review – Notizen\n\n- Demo der neuen Kundenübersicht\n- Feedback: Filter nach Region ergänzen\n- Nächster Schritt: Unit-Tests für den Export\n", "utf8");
  insert("attachment", { reportId: lenaSubmitted[0].id, uploadedById: lena.id, filename: "sprint-review-notizen.txt", mimeType: "text/plain", size: notes.length, data: notes, createdAt: at(subDays(now, 9), 9, 45) });

  /* Mitteilungen */
  const note = (userId: string, title: string, message: string, link: string | null, createdAt: Date, read = true) => insert("notification", { userId, title, message, link, read, createdAt });
  note(lena.id, "Neuer Abteilungseinsatz", `Du bist ab ${format(addDays(subWeeks(today, 8), 1), "dd.MM.yyyy")} in Buchhaltung eingeplant.`, "/azubi/profil", at(subWeeks(now, 9), 11, 0));
  note(lena.id, "Bericht zurückgegeben", `KW ${String(lenaRejected.week).padStart(2, "0")}/${lenaRejected.year}: ${lenaRejected.reviewNote}`, `/azubi/berichte/${lenaRejected.id}/bearbeiten`, lenaRejected.reviewedAt);
  note(lena.id, "Neuer Kommentar", "Petra Meier hat KW " + String(lenaSubmitted[0].week).padStart(2, "0") + `/${lenaSubmitted[0].year} kommentiert.`, `/azubi/berichte/${lenaSubmitted[0].id}`, at(subDays(now, 8), 8, 55));
  note(lena.id, "Neue Chat-Nachricht", "Petra Meier: Ja, passt. Trag es bitte als Betrieb mit 6 Stunden ein.", "/azubi/chat?mit=demo-petra", at(now, 8, 15), false);
  note(jonas.id, "Willkommen im Berichtsheft", "Dein Account ist eingerichtet. Viel Erfolg in der Ausbildung!", null, at(jonasBegin, 9, 0));
  note(jonas.id, "Bericht zurückgegeben", `Tagesbericht ${format(jonasRejected.weekStart, "dd.MM.yyyy")}: ${jonasRejected.reviewNote}`, `/azubi/berichte/${jonasRejected.id}/bearbeiten`, jonasRejected.reviewedAt);
  note(jonas.id, "Tagesbericht fehlt", `Für ${format(subDays(today, 7), "EEEE, dd.MM.")} liegt noch kein Bericht vor.`, "/azubi/berichte", at(subDays(now, 6), 5, 0), false);
  note(max.id, "Erinnerung: Berichtsheft", "Karin Vogel bittet dich, fehlende Berichte nachzutragen (4 Wochen).", "/azubi/berichte", at(subDays(now, 2), 10, 30), false);
  note(petra.id, "Neuer Bericht zur Prüfung", `Lena Krüger hat KW ${String(lenaSubmitted[1].week).padStart(2, "0")}/${lenaSubmitted[1].year} eingereicht.`, `/admin/berichte/${lenaSubmitted[1].id}`, lenaSubmitted[1].submittedAt, false);
  note(petra.id, "Neuer Bericht zur Prüfung", `Jonas Weber hat Tagesbericht ${format(subDays(today, 1), "dd.MM.yyyy")} eingereicht.`, "/admin/pruefung", at(subDays(now, 1), 17, 5), false);
  note(petra.id, "Neuer Kommentar", "Lena Krüger hat einen Bericht kommentiert.", `/admin/berichte/${lenaSubmitted[0].id}`, at(subDays(now, 9), 9, 40));
  note(petra.id, "Azubi hat sich registriert", "Jonas Weber hat den Zugang aktiviert (Benutzername: jonas.weber).", "/admin/azubis/demo-jonas", at(jonasBegin, 9, 5));
  note(thomas.id, "Neuer Bericht zur Prüfung", `Jonas Weber hat Tagesbericht ${format(subDays(today, 1), "dd.MM.yyyy")} eingereicht.`, "/admin/pruefung", at(subDays(now, 1), 17, 5), false);
  note(karin.id, "Neuer Bericht zur Prüfung", `Max Becker hat KW ${String(maxSubmitted.week).padStart(2, "0")}/${maxSubmitted.year} eingereicht.`, `/admin/berichte/${maxSubmitted.id}`, maxSubmitted.submittedAt, false);
  note(admin.id, `Wochenstart KW ${String(cw.week).padStart(2, "0")}/${cw.year}`, "5 Bericht(e) warten auf Prüfung, 3 Azubi(s) haben Rückstände.", "/admin", at(startOfISOWeek(now), 5, 0), false);
  note(admin.id, "Prüfungen überfällig", "1 Bericht(e) warten seit mehr als 5 Tagen auf Prüfung.", "/admin/pruefung", at(subDays(now, 1), 5, 0), false);
  note(admin.id, "Azubi hat sich registriert", "Max Becker hat den Zugang aktiviert (Benutzername: max.becker).", "/admin/azubis/demo-max", at(maxBegin, 8, 40));

  /* Chat */
  const msg = (senderId: string, recipientId: string, text: string, createdAt: Date, read = true) => insert("message", { senderId, recipientId, text, createdAt, readAt: read ? at(createdAt, createdAt.getHours(), createdAt.getMinutes() + 7) : null });
  msg(lena.id, petra.id, `Hallo Frau Meier, ich habe den Bericht für KW ${String(lenaRejected.week).padStart(2, "0")} überarbeitet – die Ticketnummern sind jetzt drin.`, at(subDays(now, 3), 10, 12));
  msg(petra.id, lena.id, "Super, danke! Ich schaue heute Nachmittag drüber.", at(subDays(now, 3), 11, 5));
  msg(lena.id, petra.id, "Kann ich am Freitag um 14 Uhr gehen? Ich habe einen Termin in der Berufsschule wegen der Projektarbeit.", at(subDays(now, 1), 15, 40));
  msg(petra.id, lena.id, "Ja, passt. Trag es bitte als Betrieb mit 6 Stunden ein.", at(now, 8, 15), false);
  msg(jonas.id, petra.id, "Guten Morgen, der Tagesbericht von gestern ist eingereicht 👍", at(now, 7, 55), false);
  msg(admin.id, lena.id, "Hallo Lena, bitte denk an die Anmeldung zur Abschlussprüfung bis Ende des Monats.", at(subDays(now, 5), 9, 30));
  msg(lena.id, admin.id, "Danke für die Erinnerung – Unterlagen sind heute rausgegangen.", at(subDays(now, 5), 13, 10));
  msg(max.id, karin.id, "Ich reiche die fehlenden Wochen bis Freitag nach, sorry für die Verzögerung.", at(subDays(now, 2), 9, 5), false);
  msg(thomas.id, jonas.id, "Bitte nimm morgen am Vertriebsmeeting um 9 Uhr teil und schreib das Protokoll.", at(subDays(now, 4), 16, 20));
  msg(jonas.id, thomas.id, "Alles klar, bin dabei.", at(subDays(now, 4), 16, 32));

  /* Audit-Log */
  const log = (actorId: string | null, action: string, targetType: string, targetId: string | null, details: Rec | null, createdAt: Date) => insert("auditLog", { actorId, action, targetType, targetId, details, createdAt });
  log(admin.id, "SETUP_COMPLETED", "System", null, { companyName: "Muster GmbH" }, oldest);
  log(admin.id, "USER_CREATED", "User", petra.id, { username: "petra.meier", role: "AUSBILDER", invite: false }, addDays(oldest, 1));
  log(admin.id, "USER_CREATED", "User", lena.id, { username: "lena.krueger", role: "AZUBI", invite: true }, subDays(lenaBegin, 10));
  log(lena.id, "USER_REGISTERED", "User", lena.id, { username: "lena.krueger" }, lenaBegin);
  log(admin.id, "DEPARTMENT_CREATED", "Department", hr.id, { name: "Personal", code: "HR" }, subWeeks(now, 30));
  log(admin.id, "SETTINGS_UPDATED", "AppSetting", "default", { companyName: "Muster GmbH", bundesland: "BW" }, subDays(now, 12));
  log(petra.id, "ROTATION_CREATED", "Rotation", null, { azubiId: lena.id, departmentId: buh.id }, at(subWeeks(now, 9), 11, 0));
  log(lena.id, "REPORT_SUBMITTED", "Report", lenaRejected.id, { week: `KW ${String(lenaRejected.week).padStart(2, "0")}/${lenaRejected.year}` }, lenaRejected.submittedAt);
  log(petra.id, "REPORT_REJECTED", "Report", lenaRejected.id, { azubiId: lena.id, note: lenaRejected.reviewNote }, lenaRejected.reviewedAt);
  log(lena.id, "REPORT_SUBMITTED", "Report", lenaSubmitted[0].id, { week: `KW ${String(lenaSubmitted[0].week).padStart(2, "0")}/${lenaSubmitted[0].year}` }, lenaSubmitted[0].submittedAt);
  log(lena.id, "COMMENT_ADDED", "Report", lenaSubmitted[0].id, null, at(subDays(now, 9), 9, 40));
  log(petra.id, "COMMENT_ADDED", "Report", lenaSubmitted[0].id, null, at(subDays(now, 8), 8, 55));
  log(max.id, "REPORT_SUBMITTED", "Report", maxSubmitted.id, { week: `KW ${String(maxSubmitted.week).padStart(2, "0")}/${maxSubmitted.year}` }, maxSubmitted.submittedAt);
  log(petra.id, "USER_CREATED", "User", "demo-mia", { username: "mia.schmidt", role: "AZUBI", invite: true }, at(subDays(now, 4), 14, 20));
  log(petra.id, "EXPORT_PDF", "Report", null, { azubiId: lena.id, count: lenaReports.length }, at(subDays(now, 4), 15, 2));
  log(karin.id, "REMINDER_SENT", "User", max.id, { weeks: "4 Wochen" }, at(subDays(now, 2), 10, 30));
  log(jonas.id, "REPORT_SUBMITTED", "Report", jonasReports[jonasReports.length - 2]?.id ?? null, { week: `Tagesbericht ${format(subDays(today, 1), "dd.MM.yyyy")}` }, at(subDays(now, 1), 17, 5));
  log(lena.id, "REPORT_SUBMITTED", "Report", lenaSubmitted[1].id, { week: `KW ${String(lenaSubmitted[1].week).padStart(2, "0")}/${lenaSubmitted[1].year}` }, lenaSubmitted[1].submittedAt);
  log(null, "CRON_DAILY", "System", null, { newWeek: 0, fridayReminder: 0, dailyReminder: 1, staffPending: 1 }, at(subDays(now, 1), 5, 0));
  log(petra.id, "LOGIN", "User", petra.id, null, at(subDays(now, 1), 16, 40));
  log(admin.id, "LOGIN", "User", admin.id, null, at(now, 8, 5));
  log(lena.id, "LOGIN", "User", lena.id, null, at(now, 7, 50));
}
