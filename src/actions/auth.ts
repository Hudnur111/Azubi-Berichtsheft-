"use server";

import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { subMinutes } from "date-fns";
import { z } from "zod";
import { db, isDemoMode } from "@/lib/db";
import { createSessionCookie, destroySessionCookie, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { appUrl, mailEnabled, mailLayout, sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { loginGroupFor, usernameRegex, type ActionState } from "@/lib/utils";
import { DEMO_ACCOUNTS } from "@/lib/demo-data";

const MAX_FAILED = 8; // Fehlversuche je Kennung in 15 Minuten

/* ---------- Demo-Modus: Anmeldung per Klick (ohne Passwort) ---------- */

export async function demoLoginAction(formData: FormData) {
  if (!isDemoMode) redirect("/login");
  const id = String(formData.get("userId") ?? "");
  const account = DEMO_ACCOUNTS.find((a) => a.id === id);
  const user = account ? await db.user.findUnique({ where: { id: account.id } }) : null;
  if (!user || !user.active) redirect(`/login?error=${encodeURIComponent("Demo-Konto nicht gefunden.")}`);
  const mode = (process.env.PORTAL_MODE ?? "both").toLowerCase();
  if (mode === "azubi" && user.role !== "AZUBI") redirect("/login?portal=azubi");
  if (mode === "admin" && user.role === "AZUBI") redirect("/login?portal=admin");

  await createSessionCookie(user, true);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "LOGIN", "User", user.id, { demo: true });

  const next = String(formData.get("next") ?? "");
  const home = user.role === "AZUBI" ? "/azubi" : "/admin";
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : home);
}

const loginSchema = z.object({
  login: z.string().trim().min(1, "Benutzername oder E-Mail fehlt."),
  password: z.string().min(1, "Passwort fehlt."),
  group: z.enum(["AZUBI", "STAFF"]).default("AZUBI"),
  remember: z.string().optional(),
  next: z.string().optional(),
});

async function tooManyAttempts(identifier: string) {
  const since = subMinutes(new Date(), 15);
  const n = await db.auditLog.count({ where: { action: "LOGIN_FAILED", createdAt: { gte: since }, details: { path: ["login"], equals: identifier } } });
  return n >= MAX_FAILED;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const { password, next, remember } = parsed.data;
  const login = parsed.data.login.toLowerCase();
  const mode = (process.env.PORTAL_MODE ?? "both").toLowerCase();
  const group = mode === "azubi" ? "AZUBI" : mode === "admin" ? "STAFF" : parsed.data.group;

  if (await tooManyAttempts(login)) return { error: "Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen." };

  const user = login.includes("@")
    ? await db.user.findUnique({ where: { email: login } })
    : await db.user.findFirst({ where: { username: { equals: login, mode: "insensitive" }, loginGroup: group } });

  if (user && !user.passwordHash) return { error: "Dieser Account ist noch nicht aktiviert. Bitte zuerst mit dem Einladungscode registrieren." };
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    await audit(user?.id ?? null, "LOGIN_FAILED", "User", user?.id, { login });
    return { error: "Zugangsdaten sind falsch." };
  }
  if (!user.active) return { error: "Dieser Account ist deaktiviert. Bitte an die Ausbildungsleitung wenden." };
  if (mode === "azubi" && user.role !== "AZUBI") return { error: "Dieses Portal ist nur für Auszubildende. Bitte das Ausbilder-Portal nutzen." };
  if (mode === "admin" && user.role === "AZUBI") return { error: "Dieses Portal ist nur für die Ausbildung. Bitte das Azubi-Portal nutzen." };
  if (login.includes("@") && loginGroupFor(user.role) !== group && mode === "both") {
    return { error: user.role === "AZUBI" ? "Dieser Account ist ein Azubi-Zugang – bitte „Azubi“ auswählen." : "Dieser Account gehört zur Ausbildung – bitte „Ausbildung“ auswählen." };
  }

  await createSessionCookie(user, remember === "on");
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "LOGIN", "User", user.id);

  const home = user.role === "AZUBI" ? "/azubi" : "/admin";
  if (user.mustChangePassword) redirect(`${home}/profil?pw=1`);
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : home;
  redirect(target);
}

export async function logoutAction() {
  await destroySessionCookie();
  redirect("/login");
}

/* ---------- Registrierung per Einladungscode ---------- */

const codeSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/, "Der Code hat 8 Zeichen (Buchstaben und Ziffern).") });

export async function checkInviteCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = codeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const user = await db.user.findUnique({ where: { inviteCode: parsed.data.code }, select: { id: true, firstName: true, lastName: true, passwordHash: true, beruf: true, ausbildungsbeginn: true } });
  if (!user) { await audit(null, "INVITE_CODE_INVALID", "User", null, { code: parsed.data.code }); return { error: "Code nicht gefunden. Bitte prüfen oder an die Ausbildung wenden." }; }
  if (user.passwordHash) return { error: "Dieser Code wurde bereits verwendet. Bitte einloggen oder Passwort zurücksetzen." };
  redirect(`/registrieren?code=${parsed.data.code}`);
}

const registerSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/),
    username: z.string().trim().regex(usernameRegex, "Benutzername: 3–32 Zeichen, Buchstaben, Ziffern, Punkt, Bindestrich, Unterstrich."),
    email: z.string().trim().toLowerCase().email("Ungültige E-Mail.").optional().or(z.literal("")),
    password: z.string().min(8, "Passwort: mindestens 8 Zeichen."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwörter stimmen nicht überein.", path: ["confirm"] });

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const user = await db.user.findUnique({ where: { inviteCode: d.code } });
  if (!user || user.passwordHash) return { error: "Code ungültig oder bereits verwendet." };
  const group = loginGroupFor(user.role);
  if (await db.user.findFirst({ where: { username: { equals: d.username, mode: "insensitive" }, loginGroup: group, NOT: { id: user.id } } })) return { error: "Benutzername ist bereits vergeben." };
  const email = d.email || null;
  if (email && (await db.user.findFirst({ where: { email, NOT: { id: user.id } } }))) return { error: "E-Mail ist bereits vergeben." };
  await db.user.update({
    where: { id: user.id },
    data: { username: d.username, email, passwordHash: await hashPassword(d.password), mustChangePassword: false, registeredAt: new Date(), active: true, loginGroup: group },
  });
  await audit(user.id, "USER_REGISTERED", "User", user.id, { username: d.username });
  const staffIds = [user.invitedById, user.trainerId].filter(Boolean) as string[];
  if (staffIds.length) {
    const { notifyMany } = await import("@/lib/audit");
    await notifyMany(staffIds, "Azubi hat sich registriert", `${user.firstName} ${user.lastName} hat den Zugang aktiviert (Benutzername: ${d.username}).`, `/admin/azubis/${user.id}`);
  }
  await createSessionCookie({ ...user, username: d.username, email });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  redirect(user.role === "AZUBI" ? "/azubi" : "/admin");
}

/* ---------- Passwort vergessen (per E-Mail) ---------- */

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Bitte E-Mail-Adresse eingeben." };
  if (!mailEnabled()) return { error: "E-Mail-Versand ist nicht eingerichtet. Bitte an Ausbilder/in oder Admin wenden – dort kann das Passwort zurückgesetzt werden." };
  const user = await db.user.findUnique({ where: { email } });
  // Immer gleiche Antwort (keine Info, ob E-Mail existiert)
  if (user && user.active && user.passwordHash) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const { companyName } = await getSettings();
    await sendMail(email, "Passwort zurücksetzen · Berichtsheft", mailLayout(companyName, "Passwort zurücksetzen", `<p>Hallo ${user.firstName},</p><p>über den Button kannst du innerhalb von 60 Minuten ein neues Passwort vergeben. Falls du das nicht angefordert hast, ignoriere diese E-Mail.</p>`, { label: "Neues Passwort vergeben", href: appUrl(`/passwort-zuruecksetzen/${token}`) }));
    await audit(user.id, "PASSWORD_RESET_REQUESTED", "User", user.id);
  }
  return { ok: true, message: "Falls die Adresse bekannt ist, wurde eine E-Mail mit einem Link zum Zurücksetzen gesendet." };
}

const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(8, "Passwort: mindestens 8 Zeichen."), confirm: z.string() }).refine((d) => d.password === d.confirm, { message: "Passwörter stimmen nicht überein.", path: ["confirm"] });

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const rec = await db.passwordResetToken.findUnique({ where: { tokenHash: sha(parsed.data.token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { error: "Link ungültig oder abgelaufen. Bitte erneut anfordern." };
  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false } }),
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);
  await audit(rec.userId, "PASSWORD_RESET_COMPLETED", "User", rec.userId);
  redirect("/login?ok=Passwort+gesetzt.+Bitte+anmelden.");
}

/* ---------- Ersteinrichtung (nur wenn noch kein Admin existiert) ---------- */

const setupSchema = z
  .object({
    companyName: z.string().trim().min(2, "Firmenname fehlt.").max(100),
    firstName: z.string().trim().min(1, "Vorname fehlt."),
    lastName: z.string().trim().min(1, "Nachname fehlt."),
    email: z.string().trim().toLowerCase().email("Ungültige E-Mail.").optional().or(z.literal("")),
    username: z.string().trim().regex(usernameRegex, "Benutzername: 3–32 Zeichen."),
    password: z.string().min(8, "Passwort: mindestens 8 Zeichen."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwörter stimmen nicht überein.", path: ["confirm"] });

export async function setupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await db.user.count({ where: { role: "ADMIN" } })) return { error: "Die Einrichtung wurde bereits abgeschlossen." };
  const parsed = setupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const admin = await db.user.create({ data: { username: d.username, loginGroup: "STAFF", email: d.email || null, firstName: d.firstName, lastName: d.lastName, role: "ADMIN", passwordHash: await hashPassword(d.password) } });
  await db.appSetting.upsert({ where: { id: "default" }, update: { companyName: d.companyName }, create: { id: "default", companyName: d.companyName } });
  await audit(admin.id, "SETUP_COMPLETED", "System", null, { companyName: d.companyName });
  await createSessionCookie(admin);
  redirect("/admin");
}

/* ---------- Passwort ändern / Mitteilungen ---------- */

const pwSchema = z
  .object({
    current: z.string().min(1, "Aktuelles Passwort fehlt."),
    password: z.string().min(8, "Neues Passwort: mind. 8 Zeichen."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Passwörter stimmen nicht überein.", path: ["confirm"] });

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireUser();
  const parsed = pwSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const user = await db.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) return { error: "Aktuelles Passwort ist falsch." };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false } });
  await audit(me.id, "PASSWORD_CHANGED", "User", me.id);
  return { ok: true, message: "Passwort wurde geändert." };
}

const profileSchema = z.object({ email: z.string().trim().toLowerCase().email("Ungültige E-Mail.").optional().or(z.literal("")) });

export async function updateOwnProfile(formData: FormData): Promise<void> {
  const me = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  const back = me.role === "AZUBI" ? "/azubi/profil" : "/admin/profil";
  if (!parsed.success) redirect(`${back}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Ungültig")}`);
  const email = parsed.data.email || null;
  if (email && (await db.user.findFirst({ where: { email, NOT: { id: me.id } } }))) redirect(`${back}?error=${encodeURIComponent("E-Mail ist bereits vergeben.")}`);
  await db.user.update({ where: { id: me.id }, data: { email } });
  await audit(me.id, "PROFILE_UPDATED", "User", me.id, { email });
  redirect(`${back}?ok=${encodeURIComponent("Profil gespeichert.")}`);
}

export async function markNotificationsRead() {
  const me = await requireUser();
  await db.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
}
