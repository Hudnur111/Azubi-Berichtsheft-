# Azubi-Berichtsheft

Digitales Berichtsheft (Ausbildungsnachweis nach § 13 BBiG) mit zwei Portalen:

| Portal | Pfad | Für wen |
|---|---|---|
| **Azubi-Portal** | `/azubi` | Auszubildende: Wochenberichte schreiben, einreichen, Rückmeldungen sehen |
| **Admin-Portal** | `/admin` | Ausbilder/innen, Abteilungsleitungen, Administratoren: prüfen, freigeben, verwalten |

Beide Portale liegen in **einer Codebasis**. Über die Umgebungsvariable `PORTAL_MODE` bedient ein Vercel-Deployment wahlweise nur das Azubi-Portal, nur das Admin-Portal oder beide. Die Git-Branches `azubi` und `admin` sind dafür als Deployment-Branches vorgesehen (siehe unten).

## Features

**Azubi**
- Wochenbericht mit Tageseinträgen (Mo–Fr): Kategorie (Betrieb, Berufsschule, Seminar, Urlaub, Krank, Feiertag), Tätigkeiten, Stunden
- Autosave, „Wie Vortag“-Kopie, Textbausteine (eigene, globale, abteilungsspezifische)
- Einreichen → Prüfung → Genehmigung oder Rückgabe mit Begründung; erneutes Einreichen mit Versionszähler
- Dashboard: Status-Kennzahlen, fehlende Wochen, Serie pünktlicher Einreichungen
- Kommentar-Thread pro Bericht, Mitteilungen, Druck-/PDF-Ansicht mit Unterschriftsfeldern
- Profil mit Durchlaufplan und Passwortänderung (Pflichtwechsel beim ersten Login)

**Admin / Ausbilder**
- Rollen: `ADMIN`, `AUSBILDER`, `ABTEILUNGSLEITER`, `AZUBI` – Zuständigkeit über Abteilung, Ausbilder-Zuordnung und Durchlaufplan
- Prüfwarteschlange mit Abteilungsfilter, Einzel- und Sammelfreigabe, Vor/Zurück-Navigation, Wartezeit-Hinweis
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
3. **Umgebungsvariablen** je Projekt setzen: `DATABASE_URL`, `AUTH_SECRET` (min. 32 Zeichen, in beiden Projekten identisch), `PORTAL_MODE`.
4. Build-Command ist in `vercel.json` hinterlegt (`npm run vercel-build`): führt `prisma generate`, `prisma migrate deploy` und `next build` aus – Migrationen laufen also automatisch bei jedem Deploy.
5. Einmalig den Admin-Account anlegen: lokal mit der Produktions-`DATABASE_URL` `SEED_DEMO=false npm run db:seed` ausführen (oder über Vercel CLI `vercel env pull` + Seed).

Health-Check: `GET /api/health`.

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
