/**
 * Demo-Modus: Die App läuft ohne Datenbank mit einer In-Memory-Demo-Datenbank und Ein-Klick-Login.
 *
 *  - DEMO_MODE=true   → immer Demo (auch wenn DATABASE_URL gesetzt ist)
 *  - DEMO_MODE=false  → nie Demo (DATABASE_URL muss gesetzt sein)
 *  - nicht gesetzt    → Demo, sobald keine DATABASE_URL vorhanden ist
 *
 * Diese Datei hat bewusst keine Imports (wird auch in der Edge-Middleware verwendet).
 */
const flag = (process.env.DEMO_MODE ?? "").trim().toLowerCase();

export const isDemoMode = flag === "true" || flag === "1" || (flag !== "false" && flag !== "0" && !process.env.DATABASE_URL);

/** Passwort aller Demo-Konten (für die klassische Anmeldung mit Benutzername). */
export const DEMO_PASSWORD = "demo123";
