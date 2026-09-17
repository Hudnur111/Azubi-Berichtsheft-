"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, requireStaff, setFlash } from "@/lib/auth";
import { generatePassword, hashPassword } from "@/lib/password";
import { audit, notify } from "@/lib/audit";
import { azubiScope } from "@/lib/permissions";
import { generateInviteCode, loginGroupFor, usernameRegex } from "@/lib/utils";

const ROLES: [Role, ...Role[]] = ["ADMIN", "AUSBILDER", "ABTEILUNGSLEITER", "AZUBI"];
const enc = encodeURIComponent;
const optDate = z.string().optional().transform((v) => (v ? new Date(v) : null));

/* ---------- Benutzer ---------- */

const userSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ungültige E-Mail.").optional().or(z.literal("")).transform((v) => v || null),
  username: z.string().trim().regex(usernameRegex, "Benutzername: 3–32 Zeichen (Buchstaben, Ziffern, . _ -).").optional().or(z.literal("")),
  firstName: z.string().trim().min(1, "Vorname fehlt.").max(80),
  lastName: z.string().trim().min(1, "Nachname fehlt.").max(80),
  role: z.enum(ROLES),
  departmentId: z.string().optional().transform((v) => v || null),
  trainerId: z.string().optional().transform((v) => v || null),
  beruf: z.string().trim().max(120).optional().transform((v) => v || null),
  ausbildungsbeginn: optDate,
  ausbildungsende: optDate,
  password: z.string().optional(),
  active: z.string().optional(),
  accessMode: z.enum(["invite", "password"]).optional().default("password"),
});

async function uniqueUsername(base: string, group: string, excludeId?: string) {
  let candidate = base.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 28) || "user";
  let n = 1;
  while (await db.user.findFirst({ where: { username: { equals: candidate, mode: "insensitive" }, loginGroup: group, NOT: excludeId ? { id: excludeId } : undefined } })) candidate = `${base.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 26)}${++n}`;
  return candidate;
}
const slugName = (a: string, b: string) => `${a}.${b}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9.]/g, "");

export async function createUser(formData: FormData) {
  const me = await requireRole("ADMIN", "AUSBILDER");
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/benutzer/neu?error=${enc(parsed.error.issues[0]?.message ?? "Ungültig")}`);
  const d = parsed.data;
  if (me.role !== "ADMIN" && d.role !== "AZUBI") redirect(`/admin/benutzer/neu?error=${enc("Ausbilder/innen können nur Azubis anlegen.")}`);
  if (d.email && (await db.user.findUnique({ where: { email: d.email } }))) redirect(`/admin/benutzer/neu?error=${enc("E-Mail ist bereits vergeben.")}`);
  const group = loginGroupFor(d.role);
  const username = d.username ? d.username : await uniqueUsername(slugName(d.firstName, d.lastName), group);
  if (await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" }, loginGroup: group } })) redirect(`/admin/benutzer/neu?error=${enc("Benutzername ist bereits vergeben.")}`);
  const invite = d.role === "AZUBI" && d.accessMode === "invite";
  const password = invite ? null : d.password && d.password.length >= 8 ? d.password : generatePassword();
  let inviteCode: string | null = null;
  if (invite) { do { inviteCode = generateInviteCode(); } while (await db.user.findUnique({ where: { inviteCode } })); }
  const user = await db.user.create({
    data: {
      email: d.email, username, loginGroup: group, firstName: d.firstName, lastName: d.lastName, role: d.role,
      departmentId: d.departmentId ?? (me.role !== "ADMIN" ? me.departmentId : null), trainerId: d.role === "AZUBI" ? (d.trainerId ?? (me.role === "AUSBILDER" ? me.id : null)) : null,
      beruf: d.beruf, ausbildungsbeginn: d.ausbildungsbeginn, ausbildungsende: d.ausbildungsende,
      passwordHash: password ? await hashPassword(password) : "", mustChangePassword: !!password, inviteCode, invitedById: me.id,
    },
  });
  await audit(me.id, "USER_CREATED", "User", user.id, { username, role: d.role, invite });
  revalidatePath("/admin/benutzer");
  const f = password ? await setFlash(`pw:${password}`) : null;
  redirect(`/admin/benutzer/${user.id}?created=1${f ? `&f=${f}` : ""}`);
}

export async function updateUser(formData: FormData) {
  const me = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/benutzer/${id}?error=${enc(parsed.error.issues[0]?.message ?? "Ungültig")}`);
  const d = parsed.data;
  const other = d.email ? await db.user.findUnique({ where: { email: d.email } }) : null;
  if (other && other.id !== id) redirect(`/admin/benutzer/${id}?error=${enc("E-Mail ist bereits vergeben.")}`);
  const group = loginGroupFor(d.role);
  const username = d.username || (await db.user.findUniqueOrThrow({ where: { id }, select: { username: true } })).username;
  if (await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" }, loginGroup: group, NOT: { id } } })) redirect(`/admin/benutzer/${id}?error=${enc("Benutzername ist bereits vergeben.")}`);
  const active = d.active === "on";
  if (id === me.id && (!active || d.role !== "ADMIN")) redirect(`/admin/benutzer/${id}?error=${enc("Du kannst dich nicht selbst deaktivieren oder herabstufen.")}`);
  await db.user.update({
    where: { id },
    data: {
      email: d.email, username, loginGroup: group, firstName: d.firstName, lastName: d.lastName, role: d.role, active,
      departmentId: d.departmentId, trainerId: d.role === "AZUBI" ? (d.trainerId === id ? null : d.trainerId) : null,
      beruf: d.beruf, ausbildungsbeginn: d.ausbildungsbeginn, ausbildungsende: d.ausbildungsende,
    },
  });
  await audit(me.id, "USER_UPDATED", "User", id, { role: d.role, active });
  revalidatePath("/admin/benutzer");
  redirect(`/admin/benutzer/${id}?ok=${enc("Änderungen gespeichert.")}`);
}

export async function resetPassword(formData: FormData) {
  const me = await requireRole("ADMIN", "AUSBILDER");
  const id = String(formData.get("id"));
  const target = await db.user.findFirst({ where: { id, ...(me.role === "ADMIN" ? {} : azubiScope(me)) } });
  if (!target) redirect(`/admin/benutzer/${id}?error=${enc("Kein Zugriff.")}`);
  const password = generatePassword();
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password), mustChangePassword: true, inviteCode: null } });
  await audit(me.id, "PASSWORD_RESET", "User", id);
  const f = await setFlash(`pw:${password}`);
  redirect(`/admin/benutzer/${id}?f=${f}`);
}

/** Neuen Einladungscode erzeugen (setzt ggf. Passwort zurück, Azubi registriert sich neu). */
export async function regenerateInvite(formData: FormData) {
  const me = await requireRole("ADMIN", "AUSBILDER");
  const id = String(formData.get("id"));
  const target = await db.user.findFirst({ where: { id, role: "AZUBI", ...(me.role === "ADMIN" ? {} : azubiScope(me)) } });
  if (!target) redirect(`/admin/benutzer/${id}?error=${enc("Kein Zugriff.")}`);
  let inviteCode: string;
  do { inviteCode = generateInviteCode(); } while (await db.user.findUnique({ where: { inviteCode } }));
  await db.user.update({ where: { id }, data: { inviteCode, passwordHash: "", registeredAt: null } });
  await audit(me.id, "INVITE_REGENERATED", "User", id);
  redirect(`/admin/benutzer/${id}?ok=${enc("Neuer Einladungscode erzeugt. Der Azubi registriert sich damit neu.")}`);
}

export async function deleteUser(formData: FormData) {
  const me = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  if (id === me.id) redirect(`/admin/benutzer/${id}?error=${enc("Eigenen Account kann man nicht löschen.")}`);
  const u = await db.user.findUnique({ where: { id }, select: { email: true, username: true } });
  await db.user.delete({ where: { id } });
  await audit(me.id, "USER_DELETED", "User", id, { email: u?.email, username: u?.username });
  redirect(`/admin/benutzer?ok=${enc("Benutzer gelöscht.")}`);
}

/* ---------- Abteilungen ---------- */

const deptSchema = z.object({
  name: z.string().trim().min(2, "Name zu kurz.").max(100),
  code: z.string().trim().min(1, "Kürzel fehlt.").max(12).transform((v) => v.toUpperCase()),
  description: z.string().trim().max(500).optional().transform((v) => v || null),
});

export async function saveDepartment(formData: FormData) {
  const me = await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const parsed = deptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/abteilungen?error=${enc(parsed.error.issues[0]?.message ?? "Ungültig")}`);
  const d = parsed.data;
  const clash = await db.department.findFirst({ where: { OR: [{ name: d.name }, { code: d.code }], NOT: id ? { id } : undefined } });
  if (clash) redirect(`/admin/abteilungen?error=${enc("Name oder Kürzel bereits vergeben.")}`);
  if (id) {
    await db.department.update({ where: { id }, data: d });
    await audit(me.id, "DEPARTMENT_UPDATED", "Department", id, d);
  } else {
    const dep = await db.department.create({ data: d });
    await audit(me.id, "DEPARTMENT_CREATED", "Department", dep.id, d);
  }
  revalidatePath("/admin/abteilungen");
  redirect(`/admin/abteilungen?ok=${enc("Abteilung gespeichert.")}`);
}

export async function deleteDepartment(formData: FormData) {
  const me = await requireRole("ADMIN");
  const id = String(formData.get("id"));
  await db.department.delete({ where: { id } });
  await audit(me.id, "DEPARTMENT_DELETED", "Department", id);
  redirect(`/admin/abteilungen?ok=${enc("Abteilung gelöscht.")}`);
}

/* ---------- Durchlaufplan (Rotation) ---------- */

const rotationSchema = z
  .object({
    azubiId: z.string().min(1),
    departmentId: z.string().min(1, "Abteilung fehlt."),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    note: z.string().trim().max(300).optional().transform((v) => v || null),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "Ende muss nach Beginn liegen." });

export async function saveRotation(formData: FormData) {
  const me = await requireRole("ADMIN", "AUSBILDER");
  const parsed = rotationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/durchlaufplan?error=${enc(parsed.error.issues[0]?.message ?? "Ungültig")}`);
  const d = parsed.data;
  const azubi = await db.user.findFirst({ where: { id: d.azubiId, ...azubiScope(me) } });
  if (!azubi) redirect(`/admin/durchlaufplan?error=${enc("Kein Zugriff auf diesen Azubi.")}`);
  const rot = await db.rotation.create({ data: d });
  await audit(me.id, "ROTATION_CREATED", "Rotation", rot.id, { azubiId: d.azubiId, departmentId: d.departmentId });
  const dept = await db.department.findUnique({ where: { id: d.departmentId } });
  await notify(d.azubiId, "Neuer Abteilungseinsatz", `Du bist ab ${d.startDate.toLocaleDateString("de-DE")} in ${dept?.name ?? "einer Abteilung"} eingeplant.`, "/azubi/profil");
  redirect(`/admin/durchlaufplan?ok=${enc("Einsatz gespeichert.")}`);
}

export async function deleteRotation(formData: FormData) {
  const me = await requireRole("ADMIN", "AUSBILDER");
  const id = String(formData.get("id"));
  await db.rotation.delete({ where: { id } });
  await audit(me.id, "ROTATION_DELETED", "Rotation", id);
  redirect(`/admin/durchlaufplan?ok=${enc("Einsatz gelöscht.")}`);
}

/* ---------- Erinnerungen ---------- */

export async function remindAzubi(formData: FormData) {
  const me = await requireStaff();
  const azubiId = String(formData.get("azubiId"));
  const weeks = String(formData.get("weeks") ?? "");
  const azubi = await db.user.findFirst({ where: { id: azubiId, ...azubiScope(me) } });
  if (!azubi) redirect(`/admin/azubis?error=${enc("Kein Zugriff.")}`);
  await notify(azubiId, "Erinnerung: Berichtsheft", `${me.firstName} ${me.lastName} bittet dich, fehlende Berichte nachzutragen${weeks ? ` (${weeks})` : ""}.`, "/azubi/berichte");
  await audit(me.id, "REMINDER_SENT", "User", azubiId, { weeks });
  redirect(`/admin/azubis/${azubiId}?ok=${enc("Erinnerung gesendet.")}`);
}
