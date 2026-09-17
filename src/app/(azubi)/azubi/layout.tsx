import { redirect } from "next/navigation";
import { requireAzubi } from "@/lib/auth";
import { unreadMessages } from "@/lib/chat";
import { db } from "@/lib/db";
import { AppShell, type NavItem } from "@/components/shell/app-shell";

export default async function AzubiLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAzubi();
  if (!user.berichtsheftTyp) redirect("/azubi/start");
  const [unread, rejected, chat] = await Promise.all([
    db.notification.count({ where: { userId: user.id, read: false } }),
    db.report.count({ where: { azubiId: user.id, status: "REJECTED" } }),
    unreadMessages(user.id),
  ]);
  const nav: NavItem[] = [
    { href: "/azubi", label: "Übersicht", icon: "LayoutDashboard", exact: true },
    { href: "/azubi/berichte", label: "Meine Berichte", icon: "BookText", badge: rejected || undefined },
    { href: "/azubi/kalender", label: "Kalender", icon: "CalendarDays" },
    { href: "/azubi/chat", label: "Chat", icon: "MessageCircle", badge: chat || undefined },
    { href: "/azubi/vorlagen", label: "Textbausteine", icon: "Sparkles" },
    { href: "/azubi/benachrichtigungen", label: "Mitteilungen", icon: "Bell", badge: unread || undefined },
    { href: "/azubi/profil", label: "Profil", icon: "UserCircle" },
  ];
  return <AppShell user={user} nav={nav} portal="Azubi-Portal" unread={unread}>{children}</AppShell>;
}
