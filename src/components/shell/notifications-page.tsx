import Link from "next/link";
import { BellOff, CheckCheck } from "lucide-react";
import { db } from "@/lib/db";
import { markNotificationsRead } from "@/actions/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { SubmitButton } from "@/components/ui/submit-button";
import { fmtDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export async function NotificationsPage({ userId }: { userId: string }) {
  const items = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader title="Mitteilungen" description={unread ? `${unread} ungelesen` : "Alles gelesen"} actions={unread > 0 && <form action={markNotificationsRead}><SubmitButton variant="outline" size="sm"><CheckCheck className="h-4 w-4" /> Alle als gelesen markieren</SubmitButton></form>} />
      <Card>
        {items.length ? (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const inner = (
                <div className={cn("px-5 py-3", !n.read && "bg-brand-50/40")}>
                  <div className="flex items-center justify-between gap-3"><p className={cn("text-sm", !n.read ? "font-semibold text-slate-900" : "font-medium text-slate-700")}>{n.title}</p><span className="shrink-0 text-xs text-slate-400">{fmtDateTime(n.createdAt)}</span></div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                </div>
              );
              return <li key={n.id}>{n.link ? <Link href={n.link} className="block hover:bg-slate-50">{inner}</Link> : inner}</li>;
            })}
          </ul>
        ) : <Empty icon={BellOff} title="Keine Mitteilungen" />}
      </Card>
    </>
  );
}
