import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope, ROLE_LABELS } from "@/lib/permissions";
import { AppShell, type NavItem } from "@/components/shell/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const [unread, pending] = await Promise.all([
    db.notification.count({ where: { userId: user.id, read: false } }),
    db.report.count({ where: { status: "SUBMITTED", ...reportScope(user) } }),
  ]);
  const nav: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", exact: true },
    { href: "/admin/pruefung", label: "Prüfung", icon: "ClipboardCheck", badge: pending || undefined },
    { href: "/admin/azubis", label: "Auszubildende", icon: "GraduationCap" },
    { href: "/admin/berichte", label: "Alle Berichte", icon: "BookText" },
    { href: "/admin/durchlaufplan", label: "Durchlaufplan", icon: "CalendarRange" },
    { href: "/admin/vorlagen", label: "Textbausteine", icon: "Sparkles" },
    ...(user.role === "ADMIN"
      ? ([
          { href: "/admin/benutzer", label: "Benutzer & Rollen", icon: "Users" },
          { href: "/admin/abteilungen", label: "Abteilungen", icon: "Building2" },
          { href: "/admin/audit", label: "Audit-Log", icon: "ScrollText" },
        ] satisfies NavItem[])
      : []),
    { href: "/admin/benachrichtigungen", label: "Mitteilungen", icon: "Bell", badge: unread || undefined },
    { href: "/admin/profil", label: "Profil", icon: "UserCircle" },
  ];
  return <AppShell user={user} nav={nav} portal={`Admin-Portal · ${ROLE_LABELS[user.role]}`} unread={unread}>{children}</AppShell>;
}
