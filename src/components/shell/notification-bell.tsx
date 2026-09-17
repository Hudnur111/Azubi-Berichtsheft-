import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({ unread, href }: { unread: number; href: string }) {
  return (
    <Link href={href} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Benachrichtigungen">
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
