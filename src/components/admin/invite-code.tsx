"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/registrieren?code=${code}` : `/registrieren?code=${code}`;
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-xl border border-brand-200 bg-white px-4 py-2 font-mono text-2xl font-semibold tracking-[0.3em] text-brand-700">{code}</code>
      <Button type="button" variant="outline" size="sm" onClick={() => copy(code)}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Code kopieren</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => copy(link)}>Registrierungs-Link kopieren</Button>
    </div>
  );
}
