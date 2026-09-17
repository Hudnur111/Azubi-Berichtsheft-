import type { Comment, EntryCategory, ReportEntry, User } from "@prisma/client";
import { MessageSquare } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS } from "@/lib/labels";
import { fmtDate, fmtDateTime, weekdayLong } from "@/lib/dates";
import { fullName, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

const catTone: Record<EntryCategory, "brand" | "info" | "warning" | "neutral" | "danger" | "success"> = {
  BETRIEB: "brand", BERUFSSCHULE: "info", SEMINAR: "success", URLAUB: "warning", KRANK: "danger", FEIERTAG: "neutral", SONSTIGES: "neutral",
};

export function EntriesTable({ entries }: { entries: ReportEntry[] }) {
  const total = entries.reduce((s, e) => s + Number(e.hours), 0);
  return (
    <div className="divide-y divide-slate-100">
      {entries.map((e) => (
        <div key={e.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[150px_1fr_70px]">
          <div>
            <p className="font-medium text-slate-900">{weekdayLong(new Date(e.date))}</p>
            <p className="text-xs text-slate-500">{fmtDate(e.date)}</p>
            <Badge tone={catTone[e.category]} className="mt-1">{CATEGORY_LABELS[e.category]}</Badge>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{e.description || <span className="italic text-slate-400">Kein Eintrag</span>}</p>
          <p className="text-right text-sm font-medium tabular-nums text-slate-700">{Number(e.hours).toLocaleString("de-DE")} h</p>
        </div>
      ))}
      <div className="flex justify-between px-5 py-3 text-sm font-semibold text-slate-900">
        <span>Gesamt</span>
        <span className="tabular-nums">{total.toLocaleString("de-DE")} h</span>
      </div>
    </div>
  );
}

export function CommentList({ comments }: { comments: (Comment & { author: Pick<User, "firstName" | "lastName" | "role"> })[] }) {
  if (!comments.length) return <p className="px-5 py-4 text-sm text-slate-400">Noch keine Kommentare.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials(c.author)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm"><span className="font-medium text-slate-900">{fullName(c.author)}</span> <span className="text-xs text-slate-400">· {ROLE_LABELS[c.author.role]} · {fmtDateTime(c.createdAt)}</span></p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CommentsCard({ comments, form }: { comments: Parameters<typeof CommentList>[0]["comments"]; form: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-slate-400" /> Kommentare &amp; Rückfragen</span>} />
      <CommentList comments={comments} />
      <CardBody className="border-t border-slate-100">{form}</CardBody>
    </Card>
  );
}
