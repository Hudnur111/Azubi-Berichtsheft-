import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

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
  } catch (e) {
    console.error("notify failed", e);
  }
}

export async function notifyMany(userIds: string[], title: string, message: string, link?: string) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return;
  try {
    await db.notification.createMany({ data: unique.map((userId) => ({ userId, title, message, link })) });
  } catch (e) {
    console.error("notifyMany failed", e);
  }
}
