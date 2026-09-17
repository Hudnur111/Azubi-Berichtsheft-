import { requireStaff } from "@/lib/auth";
import { NotificationsPage } from "@/components/shell/notifications-page";

export default async function Page() {
  const me = await requireStaff();
  return <NotificationsPage userId={me.id} />;
}
