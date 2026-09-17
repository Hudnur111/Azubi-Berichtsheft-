import { requireAzubi } from "@/lib/auth";
import { ChatPage } from "@/components/chat/chat-page";

export default async function Page({ searchParams }: { searchParams: Promise<{ mit?: string; error?: string }> }) {
  const me = await requireAzubi();
  const sp = await searchParams;
  return <ChatPage me={me} withId={sp.mit} base="/azubi/chat" error={sp.error} />;
}
