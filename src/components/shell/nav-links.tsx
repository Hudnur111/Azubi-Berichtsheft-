"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookText, Building2, CalendarRange, ClipboardCheck, GraduationCap, LayoutDashboard, ScrollText, Sparkles, UserCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ICONS = { Bell, BookText, Building2, CalendarRange, ClipboardCheck, GraduationCap, LayoutDashboard, ScrollText, Sparkles, UserCircle, Users };
export type NavIcon = keyof typeof NAV_ICONS;
export type NavItem = { href: string; label: string; icon: NavIcon; badge?: number; exact?: boolean };

export function NavLinks({ items, mobile }: { items: NavItem[]; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = NAV_ICONS[item.icon];
        if (mobile) {
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", active ? "text-brand-600" : "text-slate-500")}>
              <span className="relative"><Icon className="h-5 w-5" />{item.badge ? <span className="absolute -right-2 -top-1 rounded-full bg-red-500 px-1 text-[9px] text-white">{item.badge}</span> : null}</span>
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400")} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{item.badge}</span> : null}
          </Link>
        );
      })}
    </>
  );
}
