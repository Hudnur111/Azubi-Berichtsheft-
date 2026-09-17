import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { canChatWith, chatContacts } from "@/lib/chat";
import { markThreadRead } from "@/actions/chat";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { QueryToast } from "@/components/ui/toast";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { cn, fullName, initials } from "@/lib/utils";
import { AutoRefresh } from "./auto-refresh";
import { ChatForm } from "./chat-form";

const roleTone: Record<Role, string> = { ADMIN: "bg-brand-100 text-brand-700", AUSBILDER: "bg-sky-100 text-sky-700", ABTEILUNGSLEITER: "bg-emerald-100 text-emerald-700", AZUBI: "bg-slate-100 text-slate-600" };

export async function ChatPage({ me, withId, base, error }: { me: CurrentUser; withId?: string; base: string; error?: string }) {
  const contacts = await chatContacts(me);
  const other = withId && (await canChatWith(me, withId)) ? contacts.find((c) => c.id === withId) ?? null : null;
  let messages: { id: string; senderId: string; text: string; createdAt: Date; readAt: Date | null }[] = [];
  if (other) {
    await markThreadRead(other.id);
    messages = await db.message.findMany({
      where: { OR: [{ senderId: me.id, recipientId: other.id }, { senderId: other.id, recipientId: me.id }] },
      orderBy: { createdAt: "asc" }, take: 300,
      select: { id: true, senderId: true, text: true, createdAt: true, readAt: true },
    });
  }
  let lastDay = "";
  return (
    <>
      <AutoRefresh intervalMs={other ? 5000 : 15000} />
      <PageHeader title="Chat" description="Direkter Austausch zwischen Auszubildenden und Ausbildung." />
      <QueryToast error={error} />
      <Card className="grid min-h-[70vh] overflow-hidden lg:grid-cols-[300px_1fr]">
        <aside className={cn("border-slate-100 lg:border-r", other && "hidden lg:block")}>
          <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Kontakte</p>
          {contacts.length ? (
            <ul className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <li key={c.id}>
                  <Link href={`${base}?mit=${c.id}`} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-slate-50", other?.id === c.id && "bg-brand-50")}>
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold", roleTone[c.role])}>{initials(c)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className={cn("truncate text-sm", c.unread ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>{fullName(c)}</p>{c.last && <span className="shrink-0 text-[10px] text-slate-400">{fmtDate(c.last.createdAt, "dd.MM.")}</span>}</div>
                      <p className="truncate text-xs text-slate-500">{c.last ? c.last.text : `${ROLE_LABELS[c.role]}${c.department ? ` · ${c.department.name}` : ""}`}</p>
                    </div>
                    {c.unread > 0 && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{c.unread}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-6 text-sm text-slate-400">Keine Kontakte verfügbar.</p>}
        </aside>
        <section className="flex min-h-0 flex-col">
          {other ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <Link href={base} className="text-sm text-slate-500 lg:hidden">‹</Link>
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold", roleTone[other.role])}>{initials(other)}</div>
                <div><p className="text-sm font-semibold">{fullName(other)}</p><p className="text-xs text-slate-500">{ROLE_LABELS[other.role]}{other.department ? ` · ${other.department.name}` : ""}</p></div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-4">
                {messages.length ? messages.map((m) => {
                  const day = fmtDate(m.createdAt);
                  const showDay = day !== lastDay; lastDay = day;
                  const mine = m.senderId === me.id;
                  return (
                    <div key={m.id}>
                      {showDay && <p className="my-3 text-center text-[11px] text-slate-400">{day}</p>}
                      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", mine ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-white text-slate-800")}>
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <p className={cn("mt-1 text-right text-[10px]", mine ? "text-brand-100" : "text-slate-400")}>{fmtDateTime(m.createdAt).slice(11)}{mine && (m.readAt ? " ✓✓" : " ✓")}</p>
                        </div>
                      </div>
                    </div>
                  );
                }) : <p className="py-10 text-center text-sm text-slate-400">Noch keine Nachrichten. Schreib die erste!</p>}
              </div>
              <ChatForm recipientId={other.id} />
            </>
          ) : (
            <Empty icon={MessageCircle} title="Kontakt auswählen" description="Wähle links eine Person, um den Chat zu öffnen." />
          )}
        </section>
      </Card>
    </>
  );
}
