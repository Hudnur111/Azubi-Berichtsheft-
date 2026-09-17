# Azubi-Berichtsheft

Digitales Berichtsheft (Ausbildungsnachweis nach § 13 BBiG) mit zwei Portalen:

| Portal | Pfad | Für wen |
|---|---|---|
| **Azubi-Portal** | `/azubi` | Auszubildende: Wochenberichte schreiben, einreichen, Rückmeldungen sehen |
| **Admin-Portal** | `/admin` | Ausbilder/innen, Abteilungsleitungen, Administratoren: prüfen, freigeben, verwalten |

Beide Portale liegen in **einer Codebasis**. Über die Umgebungsvariable `PORTAL_MODE` bedient ein Vercel-Deployment wahlweise nur das Azubi-Portal, nur das Admin-Portal oder beide.

**Branches:** Der App-Code lebt in den Branches `azubi` und `admin` (identischer Stand, je ein Vercel-Projekt). `main` enthält bewusst nur README und LICENSE.

## Features

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
- Textbausteine für alle oder je Abteilung, CSV-Export, revisionssicheres Audit-Log

## Tech-Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL · JWT-Session (jose) · bcrypt

## Lokal starten

```bash
cp .env.example .env          # DATABASE_URL, AUTH_SECRET anpassen
npm install
npx prisma migrate deploy     # Schema anlegen
npm run db:seed               # Admin + Demo-Daten
npm run dev
```

Demo-Zugänge nach dem Seed (Passwort jeweils `Demo123!`, Admin: `Admin123!`):

| Rolle | E-Mail |
|---|---|
| Admin | admin@example.com |
| Ausbilderin | ausbilder@example.com |
| Abteilungsleiter | leitung.vertrieb@example.com |
| Azubi | azubi@example.com, azubi2@example.com |

Demo-Daten lassen sich mit `SEED_DEMO=false` abschalten.

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
5. Einmalig den Admin-Account anlegen: lokal mit der Produktions-`DATABASE_URL` `SEED_DEMO=false npm run db:seed` ausführen (oder über Vercel CLI `vercel env pull` + Seed).

Health-Check: `GET /api/health`. Cron manuell testen: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/daily`.

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

## Rollen & Sichtbarkeit

| Rolle | Sieht / prüft |
|---|---|
| ADMIN | alles; verwaltet Benutzer, Abteilungen, Audit-Log |
| AUSBILDER | eigene zugewiesene Azubis + Azubis der eigenen Abteilung |
| ABTEILUNGSLEITER | Azubis mit Stammabteilung oder aktuellem Einsatz (Durchlaufplan) in der eigenen Abteilung |
| AZUBI | nur eigene Berichte |
