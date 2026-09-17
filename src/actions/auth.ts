"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSessionCookie, destroySessionCookie, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import type { ActionState } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail eingeben."),
  password: z.string().min(1, "Passwort fehlt."),
  next: z.string().optional(),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const { email, password, next } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    await audit(user?.id ?? null, "LOGIN_FAILED", "User", user?.id, { email });
    return { error: "E-Mail oder Passwort ist falsch." };
  }
  if (!user.active) return { error: "Dieser Account ist deaktiviert. Bitte an die Ausbildungsleitung wenden." };

  const mode = (process.env.PORTAL_MODE ?? "both").toLowerCase();
  if (mode === "azubi" && user.role !== "AZUBI") return { error: "Dieses Portal ist nur für Auszubildende. Bitte das Admin-Portal nutzen." };
  if (mode === "admin" && user.role === "AZUBI") return { error: "Dieses Portal ist nur für Ausbilder/innen. Bitte das Azubi-Portal nutzen." };

  await createSessionCookie(user);
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
  await db.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false },
  });
  await audit(me.id, "PASSWORD_CHANGED", "User", me.id);
  return { ok: true, message: "Passwort wurde geändert." };
}

export async function markNotificationsRead() {
  const me = await requireUser();
  await db.notification.updateMany({ where: { userId: me.id, read: false }, data: { read: true } });
}
