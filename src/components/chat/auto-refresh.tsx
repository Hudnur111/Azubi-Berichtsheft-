"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Lädt Server-Daten periodisch neu (Chat-Polling), nur wenn der Tab sichtbar ist. */
export function AutoRefresh({ intervalMs = 6000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") router.refresh(); };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [router, intervalMs]);
  return null;
}
