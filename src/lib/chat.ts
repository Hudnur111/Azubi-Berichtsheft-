import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { azubiScope } from "./permissions";

/** Mit wem darf ein Nutzer chatten? */
export async function chatContactsWhere(user: CurrentUser): Promise<Prisma.UserWhereInput> {
  if (user.role === "AZUBI") {
    const now = new Date();
    const rot = await db.rotation.findFirst({ where: { azubiId: user.id, startDate: { lte: now }, endDate: { gte: now } }, select: { departmentId: true } });
    const deptIds = [user.departmentId, rot?.departmentId].filter(Boolean) as string[];
    return {
      active: true,
      id: { not: user.id },
      OR: [
        { role: "ADMIN" },
        { id: user.trainerId ?? "__none__" },
        ...(deptIds.length ? [{ role: { in: ["AUSBILDER" as const, "ABTEILUNGSLEITER" as const] }, departmentId: { in: deptIds } }] : []),
      ],
    };
  }
  return { active: true, id: { not: user.id }, OR: [azubiScope(user), { role: { in: ["ADMIN", "AUSBILDER", "ABTEILUNGSLEITER"] } }] };
}

export async function chatContacts(user: CurrentUser) {
  const where = await chatContactsWhere(user);
  const [contacts, unreadBy, last] = await Promise.all([
    db.user.findMany({ where, orderBy: [{ role: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, role: true, department: { select: { name: true } } } }),
    db.message.groupBy({ by: ["senderId"], where: { recipientId: user.id, readAt: null }, _count: { _all: true } }),
    db.message.findMany({ where: { OR: [{ senderId: user.id }, { recipientId: user.id }] }, orderBy: { createdAt: "desc" }, take: 200, select: { senderId: true, recipientId: true, text: true, createdAt: true } }),
  ]);
  const unread = new Map(unreadBy.map((u) => [u.senderId, u._count._all]));
  const lastMsg = new Map<string, { text: string; createdAt: Date }>();
  for (const m of last) {
    const other = m.senderId === user.id ? m.recipientId : m.senderId;
    if (!lastMsg.has(other)) lastMsg.set(other, { text: m.text, createdAt: m.createdAt });
  }
  return contacts
    .map((c) => ({ ...c, unread: unread.get(c.id) ?? 0, last: lastMsg.get(c.id) ?? null }))
    .sort((a, b) => (b.last?.createdAt.getTime() ?? 0) - (a.last?.createdAt.getTime() ?? 0) || (b.unread - a.unread));
}

export async function canChatWith(user: CurrentUser, otherId: string) {
  const where = await chatContactsWhere(user);
  return !!(await db.user.findFirst({ where: { AND: [where, { id: otherId }] }, select: { id: true } }));
}

export const unreadMessages = (userId: string) => db.message.count({ where: { recipientId: userId, readAt: null } });
