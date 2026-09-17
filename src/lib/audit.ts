import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { appUrl, mailEnabled, mailLayout, sendMail } from "./mail";
import { getSettings } from "./settings";

export async function audit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId?: string | null,
  details?: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({ data: { actorId, action, targetType, targetId: targetId ?? null, details } });
  } catch (e) {
    console.error("audit failed", e);
  }
}

export async function notify(userId: string, title: string, message: string, link?: string) {
  try {
    await db.notification.create({ data: { userId, title, message, link } });
    await mailNotification([userId], title, message, link);
  } catch (e) {
    console.error("notify failed", e);
  }
}

/** Best-effort E-Mail-Kopie einer Mitteilung (nur wenn Mailversand konfiguriert und E-Mail hinterlegt). */
async function mailNotification(userIds: string[], title: string, message: string, link?: string) {
  if (!mailEnabled()) return;
  const users = await db.user.findMany({ where: { id: { in: userIds }, active: true, email: { not: null } }, select: { email: true, firstName: true } });
  const { companyName } = await getSettings();
  await Promise.allSettled(users.map((u) => sendMail(u.email, `${title} · Berichtsheft`, mailLayout(companyName, title, `<p>Hallo ${u.firstName},</p><p>${message}</p>`, link ? { label: "Im Berichtsheft öffnen", href: appUrl(link) } : undefined))));
}

export async function notifyMany(userIds: string[], title: string, message: string, link?: string) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return;
  try {
    await db.notification.createMany({ data: unique.map((userId) => ({ userId, title, message, link })) });
    await mailNotification(unique, title, message, link);
  } catch (e) {
    console.error("notifyMany failed", e);
  }
}
