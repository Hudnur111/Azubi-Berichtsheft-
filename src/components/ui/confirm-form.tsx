"use client";
import { cn } from "@/lib/utils";

/** Formular, das vor dem Absenden eine Bestätigung verlangt. */
export function ConfirmForm({ action, confirm, className, children }: { action: (fd: FormData) => void | Promise<void>; confirm: string; className?: string; children: React.ReactNode }) {
  return (
    <form
      action={action}
      className={cn("inline", className)}
      onSubmit={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }}
    >
      {children}
    </form>
  );
}
