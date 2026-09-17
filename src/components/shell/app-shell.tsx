import Link from "next/link";
import { LogOut } from "lucide-react";
import { Brand } from "./auth-layout";
import type { CurrentUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { fullName, initials } from "@/lib/utils";
import { NavLinks, type NavItem } from "./nav-links";
import { NotificationBell } from "./notification-bell";

export type { NavItem };

export function AppShell({ user, nav, portal, unread, children }: { user: CurrentUser; nav: NavItem[]; portal: string; unread: number; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link href={nav[0]?.href ?? "/"} className="block px-5 py-5"><Brand /><span className="mt-1 block pl-[52px] text-[11px] text-slate-400">{portal}</span></Link>
        <nav className="flex-1 space-y-1 px-3">
          <NavLinks items={nav} />
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{initials(user)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fullName(user)}</p>
              <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <form action={logoutAction}>
              <button title="Abmelden" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><LogOut className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="lg:hidden"><Brand size="sm" /></div>
          <div className="hidden text-sm text-slate-500 lg:block">
            {user.department ? <>Abteilung: <span className="font-medium text-slate-700">{user.department.name}</span></> : portal}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell unread={unread} href={user.role === "AZUBI" ? "/azubi/benachrichtigungen" : "/admin/benachrichtigungen"} />
            <form action={logoutAction} className="lg:hidden">
              <button title="Abmelden" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><LogOut className="h-4 w-4" /></button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
        <nav className="no-print fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white lg:hidden">
          <NavLinks items={(nav.filter((n) => n.mobile).length ? nav.filter((n) => n.mobile) : nav).slice(0, 5)} mobile />
        </nav>
      </div>
    </div>
  );
}
