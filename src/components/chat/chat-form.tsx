"use client";
import { useRef } from "react";
import { Send } from "lucide-react";
import { sendMessage } from "@/actions/chat";
import { SubmitButton } from "@/components/ui/submit-button";

export function ChatForm({ recipientId }: { recipientId: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => { await sendMessage(fd); ref.current?.reset(); }}
      className="flex items-end gap-2 border-t border-slate-100 p-3"
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName === "TEXTAREA") { e.preventDefault(); ref.current?.requestSubmit(); } }}
    >
      <input type="hidden" name="recipientId" value={recipientId} />
      <textarea name="text" rows={2} required maxLength={4000} placeholder="Nachricht schreiben … (Enter = senden, Shift+Enter = Zeilenumbruch)" className="input resize-none" autoFocus />
      <SubmitButton size="md" pendingText="…"><Send className="h-4 w-4" /></SubmitButton>
    </form>
  );
}
