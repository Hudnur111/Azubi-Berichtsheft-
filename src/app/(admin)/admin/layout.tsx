import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope, ROLE_LABELS } from "@/lib/permissions";
import { unreadMessages } from "@/lib/chat";
import { AppShell, type NavItem } from "@/components/shell/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [unread, pending, chat] = await Promise.all([
    db.notification.count({ where: { userId: user.id, read: false } }),
    db.report.count({ where: { status: "SUBMITTED", ...reportScope(user) } }),
    unreadMessages(user.id),
  ]);
  const nav: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", exact: true, mobile: true },
    { href: "/admin/pruefung", label: "Prüfung", icon: "ClipboardCheck", badge: pending || undefined, mobile: true },
    { href: "/admin/azubis", label: "Azubis", icon: "GraduationCap", mobile: true },
    { href: "/admin/berichte", label: "Alle Berichte", icon: "BookText" },
    { href: "/admin/kalender", label: "Kalender", icon: "CalendarDays" },
    { href: "/admin/chat", label: "Chat", icon: "MessageCircle", badge: chat || undefined, mobile: true },
    { href: "/admin/durchlaufplan", label: "Durchlaufplan", icon: "CalendarRange" },
    { href: "/admin/vorlagen", label: "Textbausteine", icon: "Sparkles" },
    ...(user.role === "ADMIN"
      ? ([
          { href: "/admin/benutzer", label: "Benutzer & Rollen", icon: "Users" },
          { href: "/admin/abteilungen", label: "Abteilungen", icon: "Building2" },
          { href: "/admin/audit", label: "Audit-Log", icon: "ScrollText" },
          { href: "/admin/einstellungen", label: "Einstellungen", icon: "Settings" },
        ] satisfies NavItem[])
      : []),
    { href: "/admin/benachrichtigungen", label: "Mitteilungen", icon: "Bell", badge: unread || undefined },
    { href: "/admin/profil", label: "Profil", icon: "UserCircle", mobile: true },
  ];
  return <AppShell user={user} nav={nav} portal={`Admin-Portal · ${ROLE_LABELS[user.role]}`} unread={unread}>{children}</AppShell>;
}
