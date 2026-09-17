import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_TTL_REMEMBER_SECONDS, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";

export type CurrentUser = Pick<
  User,
  "id" | "email" | "username" | "firstName" | "lastName" | "role" | "departmentId" | "trainerId" | "active" | "mustChangePassword" | "berichtsheftTyp" | "ausbildungsbeginn" | "ausbildungsende" | "ausbildungsjahr" | "beruf"
> & { department: { id: string; name: string; code: string } | null };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true, email: true, username: true, firstName: true, lastName: true, role: true, departmentId: true, trainerId: true,
      active: true, mustChangePassword: true, berichtsheftTyp: true, ausbildungsbeginn: true, ausbildungsende: true,
      ausbildungsjahr: true, beruf: true,
      department: { select: { id: true, name: true, code: true } },
    },
  });
  if (!user || !user.active) return null;
  return user;
});

export async function createSessionCookie(user: Pick<User, "id" | "role" | "firstName" | "lastName" | "email" | "username">, remember = false) {
  const ttl = remember ? SESSION_TTL_REMEMBER_SECONDS : SESSION_TTL_SECONDS;
  const token = await signSession({
    sub: user.id,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email ?? user.username,
  }, ttl);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

/** Einmal-Anzeige eines generierten Passworts: wird in der DB abgelegt und beim ersten Lesen gelöscht. */
export async function setFlash(value: string) {
  const rec = await db.oneTimeSecret.create({ data: { payload: value, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  return rec.id;
}
export async function readFlash(id: string | undefined): Promise<string | null> {
  if (!id) return null;
  const rec = await db.oneTimeSecret.findUnique({ where: { id } });
  if (!rec) return null;
  await db.oneTimeSecret.delete({ where: { id } }).catch(() => {});
  await db.oneTimeSecret.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  return rec.expiresAt > new Date() ? rec.payload : null;
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const isStaff = (role: Role) => role !== "AZUBI";

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAzubi(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "AZUBI") redirect("/admin");
  return user;
}

export async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/azubi");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(isStaff(user.role) ? "/admin" : "/azubi");
  return user;
}
