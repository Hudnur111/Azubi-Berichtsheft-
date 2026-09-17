import { requireAzubi } from "@/lib/auth";
import { NotificationsPage } from "@/components/shell/notifications-page";

export default async function Page() {
  const me = await requireAzubi();
  return <NotificationsPage userId={me.id} />;
}
