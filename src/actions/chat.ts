"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canChatWith } from "@/lib/chat";
import { notify } from "@/lib/audit";
import { fullName } from "@/lib/utils";

const chatBase = (role: string) => (role === "AZUBI" ? "/azubi/chat" : "/admin/chat");

export async function sendMessage(formData: FormData) {
  const me = await requireUser();
  const recipientId = String(formData.get("recipientId"));
  const text = String(formData.get("text") ?? "").trim().slice(0, 4000);
  const back = `${chatBase(me.role)}?mit=${recipientId}`;
  if (!text) redirect(back);
  if (!(await canChatWith(me, recipientId))) redirect(`${chatBase(me.role)}?error=${encodeURIComponent("Kein Zugriff auf diesen Kontakt.")}`);
  await db.message.create({ data: { senderId: me.id, recipientId, text } });
  // Benachrichtigung nur, wenn der Empfänger nicht gerade ungelesene Nachrichten von mir hat (kein Spam)
  const pending = await db.message.count({ where: { senderId: me.id, recipientId, readAt: null } });
  if (pending <= 1) await notify(recipientId, "Neue Chat-Nachricht", `${fullName(me)}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`, `${chatBase((await db.user.findUnique({ where: { id: recipientId }, select: { role: true } }))?.role ?? "AZUBI")}?mit=${me.id}`);
  revalidatePath(back);
  redirect(back);
}

export async function markThreadRead(otherId: string) {
  const me = await requireUser();
  await db.message.updateMany({ where: { senderId: otherId, recipientId: me.id, readAt: null }, data: { readAt: new Date() } });
}
