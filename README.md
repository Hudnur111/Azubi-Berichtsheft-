# Azubi-Berichtsheft

Digitales Berichtsheft (Ausbildungsnachweis nach § 13 BBiG) mit zwei Portalen:

| Portal | Pfad | Für wen |
|---|---|---|
| **Azubi-Portal** | `/azubi` | Auszubildende: Wochenberichte schreiben, einreichen, Rückmeldungen sehen |
| **Admin-Portal** | `/admin` | Ausbilder/innen, Abteilungsleitungen, Administratoren: prüfen, freigeben, verwalten |

Beide Portale liegen in **einer Codebasis**. Über die Umgebungsvariable `PORTAL_MODE` bedient ein Vercel-Deployment wahlweise nur das Azubi-Portal, nur das Admin-Portal oder beide.

**Branches:** Der App-Code lebt in den Branches `azubi` und `admin` (identischer Stand, je ein Vercel-Projekt). `main` enthält bewusst nur README und LICENSE.

## Features

**Zugang & Registrierung**
- Anmeldung mit **Benutzername oder E-Mail**; bei gemeinsamem Deployment Umschalter „Azubi / Ausbildung“ (Benutzernamen sind je Portal eindeutig)
- **Einladungscode**: Ausbilder/in legt Azubi mit Name, Beruf und Ausbildungsbeginn an → 8-stelliger Code → Azubi registriert sich unter `/registrieren`, wählt Benutzername und Passwort und ist automatisch mit Ausbilder/in und Abteilung verknüpft
- Alternativ Startpasswort (einmalige Anzeige, Pflichtwechsel beim ersten Login), „Angemeldet bleiben“, Passwort vergessen per E-Mail (wenn Mailversand konfiguriert), Sperre nach 8 Fehlversuchen
- **Ersteinrichtung** ohne Seed: `/setup` legt den ersten Admin an, solange keiner existiert

**Azubi**
- Beim ersten Login wählbar: **Wochenbericht** (Mo–Fr in einem Formular) oder **Tagesbericht** (ein Bericht je Werktag); später im Profil änderbar
- Einträge mit Kategorie (Betrieb, Berufsschule, Seminar, Urlaub, Krank, Feiertag), Tätigkeiten, Stunden
- Autosave, „Wie Vortag“-Kopie, Textbausteine (eigene, globale, abteilungsspezifische)
- Einreichen → Prüfung → Genehmigung oder Rückgabe mit Begründung; erneutes Einreichen mit Versionszähler
- Dashboard: Status-Kennzahlen, fehlende Wochen, Serie pünktlicher Einreichungen
- **Anhänge** pro Bericht (Bilder, PDF, Office; max. 4 MB, 10 Stück), gespeichert in der Datenbank
- **PDF-Export**: einzelner Bericht (Woche oder Tag), Jahr oder das gesamte Berichtsheft mit Deckblatt und Inhaltsverzeichnis
- **Chat** mit Ausbilder/in, Abteilungsleitung und Admins (Lesebestätigung, Ungelesen-Badge) sowie Kommentar-Thread pro Bericht
- **Kalender** (Monatsansicht) mit Berichtsstatus je Tag/Woche, Lücken-Markierung und Abteilungseinsätzen
- Mitteilungen: neue Woche, Einreich-Erinnerung (Fr), fehlender Tagesbericht, Genehmigung/Rückgabe, Chat, Korrekturen durch Ausbildung
- Profil mit Durchlaufplan und Passwortänderung (Pflichtwechsel beim ersten Login)

**Admin / Ausbilder**
- Rollen: `ADMIN`, `AUSBILDER`, `ABTEILUNGSLEITER`, `AZUBI` – Zuständigkeit über Abteilung, Ausbilder-Zuordnung und Durchlaufplan
- Prüfwarteschlange mit Abteilungsfilter, Einzel- und Sammelfreigabe, Vor/Zurück-Navigation, Wartezeit-Hinweis
- Berichte **einsehen, bearbeiten** (jede Korrektur wird protokolliert, als Kommentar hinterlegt und dem Azubi mitgeteilt), **bestätigen** oder mit Begründung **zurückgeben**
- Chat mit Azubis und Kollegium, Kalender je Azubi oder gesamt, Berichtsheft-PDF je Azubi
- Mitteilungen: neue Einreichungen, Wochenstart-Übersicht (offene Prüfungen, Rückstände), überfällige Prüfungen (> 5 Tage)
- Azubi-Akte: Berichtsübersicht, Rückstände, genehmigte Stunden, Erinnerung senden
- Benutzerverwaltung: Accounts anlegen, Rollen, Abteilung, Ausbilder-Zuordnung, Passwort-Reset, Deaktivieren
- Abteilungen, Durchlaufplan (Abteilungseinsätze mit automatischer Zuordnung der Berichte)
- Textbausteine für alle oder je Abteilung, CSV-Export, Volltextsuche, revisionssicheres Audit-Log
- **Einstellungen**: Firmenname, Logo (erscheint in App, Login und E-Mails), Bundesland für Feiertage, Impressum und Datenschutz, Systemstatus der Konfiguration
- **Feiertage** (Standard: Baden-Württemberg, in den Einstellungen änderbar) werden automatisch in neuen Berichten vorbelegt, im Kalender angezeigt und bei Rückständen nicht mitgezählt

## Tech-Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL · JWT-Session (jose) · bcrypt

## Demo-Modus (ohne Datenbank)

Ohne `DATABASE_URL` (oder mit `DEMO_MODE=true`) startet die App als **Demo**: eine In-Memory-Datenbank mit fiktiven Daten ersetzt PostgreSQL, und auf der Login-Seite genügt ein Klick auf ein Konto – kein Passwort nötig. Alle Funktionen (Berichte schreiben, einreichen, prüfen, Chat, Kalender, PDF/CSV-Export, Benutzer- und Abteilungsverwaltung, Einstellungen, Audit-Log) sind nutzbar; Änderungen bleiben erhalten, bis der Server neu startet (auf Vercel/Netlify: bis zum nächsten Kaltstart der Function).

```bash
npm install
npm run dev            # → http://localhost:3000/login, Konto anklicken
npm run demo:check     # Selbsttest der In-Memory-Datenbank
```

| Konto (Klick) | Rolle | Was man sieht |
|---|---|---|
| Sabine Hoffmann | Administrator | Benutzer & Rollen, Abteilungen, Einstellungen, Audit-Log |
| Petra Meier | Ausbilderin (IT) | Prüfwarteschlange, Azubi-Akten, Durchlaufplan, Chat |
| Thomas Schulz | Abteilungsleiter (Vertrieb) | Azubis mit Einsatz im Vertrieb |
| Lena Krüger | Azubi, Wochenberichte | 2 Jahre Berichte, Entwurf, Rückgabe, fehlende Woche |
| Jonas Weber | Azubi, Tagesberichte | Tagesberichte, fehlende Tage |
| Max Becker | Azubi, Wochenberichte | Rückstand, überfällige Prüfung |

Klassische Anmeldung: Benutzername (z. B. `petra.meier`, `lena.krueger`) mit Passwort `demo123`. Registrierung testen: Einladungscode `DEMO2026` (Mia Schmidt).
Für den Produktivbetrieb `DATABASE_URL` setzen (und ggf. `DEMO_MODE=false`).

## Lokal starten (mit Datenbank)

```bash
cp .env.example .env          # DATABASE_URL, AUTH_SECRET anpassen
npm install
npx prisma migrate deploy     # Schema anlegen
npm run db:seed               # Admin + Demo-Daten
npm run dev
```

Zugänge nach dem Seed (Passwort jeweils `Start1234!`):

| Portal | Benutzername | Rolle |
|---|---|---|
| Ausbildung | `Admin` | Administrator |
| Azubi | `Admin` | Test-Azubi (Onboarding noch offen) |
| Ausbildung | `petra.meier` | Ausbilderin |
| Ausbildung | `thomas.schulz` | Abteilungsleiter |
| Azubi | `lena.krueger`, `jonas.weber` | Azubis mit Demo-Berichten |
| Azubi | Einladungscode `DEMO2026` | Registrierung ausprobieren (Mia Schmidt) |

Demo-Daten lassen sich mit `SEED_DEMO=false` abschalten; dann wird nur der Admin-Zugang angelegt. Ohne Seed: nach dem Deploy `/setup` öffnen.

## Deployment auf Vercel

1. **Datenbank**: Vercel Postgres / Neon / Supabase anlegen und `DATABASE_URL` notieren.
2. **Vercel-Projekt(e)** aus diesem Repository anlegen. Empfohlen: zwei Projekte mit unterschiedlichem Production-Branch:

   | Projekt | Production Branch | `PORTAL_MODE` | Beispiel-Domain |
   |---|---|---|---|
   | berichtsheft-azubi | `azubi` | `azubi` | azubi.firma.de |
   | berichtsheft-admin | `admin` | `admin` | ausbildung.firma.de |

   Alternativ ein Projekt mit `PORTAL_MODE=both` – dann sind beide Portale unter einer Domain erreichbar.
3. **Umgebungsvariablen** je Projekt setzen: `DATABASE_URL`, `AUTH_SECRET` (min. 32 Zeichen, in beiden Projekten identisch), `PORTAL_MODE`, `CRON_SECRET` (Vercel schickt ihn automatisch als Bearer-Token an den Cron-Endpunkt).
   Der tägliche Erinnerungs-Cron (`/api/cron/daily`, 05:00 UTC, siehe `vercel.json`) muss nur in **einem** der beiden Projekte aktiv sein – im anderen den `crons`-Block entfernen oder ignorieren (doppelte Mitteilungen sonst).
4. Build-Command ist in `vercel.json` hinterlegt (`npm run vercel-build`): führt `prisma generate`, `prisma migrate deploy` und `next build` aus – Migrationen laufen also automatisch bei jedem Deploy.
5. Ersten Admin anlegen: Deployment öffnen → `/setup` (nur solange kein Admin existiert). Alternativ `SEED_DEMO=false npm run db:seed` mit der Produktions-`DATABASE_URL`.
6. Optional: `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL` für E-Mail-Benachrichtigungen und „Passwort vergessen“; `TZ=Europe/Berlin` (wird sonst serverseitig gesetzt).
7. Im Admin-Portal unter **Einstellungen** Firmenname, Logo, Bundesland, Impressum und Datenschutz pflegen.

Health-Check: `GET /api/health`. Cron manuell testen: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/daily`.

## Deployment auf Netlify

Die App läuft auch auf Netlify (Next.js App Router mit Server Actions über `@netlify/plugin-nextjs`, in `netlify.toml` bereits deklariert – Netlify installiert das Plugin automatisch).

1. **Datenbank**: Postgres anlegen (Neon, Supabase, Vercel Postgres, …) und `DATABASE_URL` notieren.
2. **Netlify-Site** aus diesem Repository anlegen, Branch `azubi` bzw. `admin` als Deploy-Branch wählen (analog zum Vercel-Setup: entweder zwei Sites für die zwei Portale, oder eine Site mit `PORTAL_MODE=both`).
3. **Build-Command**: `netlify.toml` setzt bereits `npm run netlify-build` (führt `prisma generate`, `prisma migrate deploy` und `next build` aus). Falls die Netlify-UI einen eigenen Build-Command überschreibt, dort ebenfalls `npm run netlify-build` eintragen.
4. **Umgebungsvariablen** unter *Site configuration → Environment variables* setzen: `DATABASE_URL`, `AUTH_SECRET` (min. 32 Zeichen), `PORTAL_MODE`, `CRON_SECRET`. Ohne `DATABASE_URL` läuft die Site im Demo-Modus (Migrationen werden dann im Build übersprungen).
5. **Cron**: `vercel.json` wird auf Netlify nicht ausgewertet – der tägliche Erinnerungs-Cron (`/api/cron/daily`) braucht hier einen externen Aufruf, z. B. eine [Netlify Scheduled Function](https://docs.netlify.com/functions/scheduled-functions/) oder einen externen Dienst (cron-job.org, GitHub Actions `schedule`), der täglich `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/daily` aufruft.
6. Ersten Admin anlegen: `/setup` öffnen (nur solange kein Admin existiert) oder `SEED_DEMO=false npm run db:seed` mit der Produktions-`DATABASE_URL` ausführen.
7. Optional wie bei Vercel: `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL`.

Alle Seiten sind serverseitig dynamisch gerendert (`export const dynamic = "force-dynamic"` im Root-Layout) – nichts wird beim Build statisch vorgerendert, daher wird `DATABASE_URL` nur zur Laufzeit und für `prisma migrate deploy` im Build benötigt, nicht für die Next.js-Seitengenerierung selbst.

## Scripts

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklung |
| `npm run build` | Produktions-Build |
| `npm run typecheck` / `npm run lint` | Qualitätssicherung |
| `npm run db:migrate` | Neue Migration erzeugen (Entwicklung) |
| `npm run db:deploy` | Migrationen anwenden |
| `npm run db:seed` | Admin + Demo-Daten |
| `npm run db:studio` | Prisma Studio |
| `npm run demo:check` | Selbsttest der In-Memory-Demo-Datenbank |

## Rollen & Sichtbarkeit

| Rolle | Sieht / prüft |
|---|---|
| ADMIN | alles; verwaltet Benutzer, Abteilungen, Audit-Log |
| AUSBILDER | eigene zugewiesene Azubis + Azubis der eigenen Abteilung |
| ABTEILUNGSLEITER | Azubis mit Stammabteilung oder aktuellem Einsatz (Durchlaufplan) in der eigenen Abteilung |
| AZUBI | nur eigene Berichte |
