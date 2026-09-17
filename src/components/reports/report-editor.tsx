"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { EntryCategory } from "@prisma/client";
import { Check, CloudUpload, Loader2, Send, Sparkles } from "lucide-react";
import { saveReport, saveReportStaff, submitReportById, type SavePayload } from "@/actions/reports";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type EditorEntry = { id: string; date: string; category: EntryCategory; description: string; hours: number };
export type EditorTemplate = { id: string; title: string; content: string; category: EntryCategory };

const NON_WORK: EntryCategory[] = ["URLAUB", "KRANK", "FEIERTAG"];

export function ReportEditor({ reportId, initialSummary, initialEntries, templates, weekdays, mode = "azubi" }: {
  reportId: string; initialSummary: string; initialEntries: EditorEntry[]; templates: EditorTemplate[]; weekdays: string[]; mode?: "azubi" | "staff";
}) {
  const staff = mode === "staff";
  const save = staff ? saveReportStaff : saveReport;
  const [entries, setEntries] = useState(initialEntries);
  const [summary, setSummary] = useState(initialSummary);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState("Gespeichert");
  const [tplFor, setTplFor] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = useMemo<SavePayload>(() => ({ reportId, summary, entries }), [reportId, summary, entries]);

  const persist = useCallback(() => {
    setStatus("saving");
    startTransition(async () => {
      const res = await save(payload);
      if (res?.error) { setStatus("error"); setError(res.error); }
      else { setStatus("saved"); setError(null); setDirty(false); setSavedMsg(res?.message ?? "Gespeichert"); }
    });
  }, [payload, save]);

  // Autosave 1,5 s nach letzter Änderung
  useEffect(() => {
    if (!dirty || staff) return; // Ausbilder speichern bewusst manuell (jede Speicherung informiert den Azubi)
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 1500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [dirty, payload, persist, staff]);

  // Warnung bei ungespeicherten Änderungen
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  /** Erst speichern, dann einreichen – so geht keine Eingabe verloren. */
  const submit = () => {
    const missing = entries.filter((e) => !e.description.trim() && !NON_WORK.includes(e.category));
    if (missing.length) { setError(`Bitte alle Tage ausfüllen (${missing.length} offen) oder als Urlaub/Krank/Feiertag markieren.`); setStatus("error"); return; }
    if (!window.confirm("Bericht jetzt zur Prüfung einreichen?")) return;
    if (timer.current) clearTimeout(timer.current);
    setSubmitting(true);
    startTransition(async () => {
      const res = await saveReport(payload);
      if (res?.error) { setStatus("error"); setError(res.error); setSubmitting(false); return; }
      setDirty(false);
      await submitReportById(reportId); // redirectet serverseitig
    });
  };

  const update = (id: string, patch: Partial<EditorEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setDirty(true);
  };
  const setCategory = (id: string, category: EntryCategory) => {
    const patch: Partial<EditorEntry> = { category };
    if (NON_WORK.includes(category)) patch.hours = 0;
    else { const cur = entries.find((e) => e.id === id); if (cur && cur.hours === 0) patch.hours = 8; }
    update(id, patch);
  };
  const markAll = (category: EntryCategory) => {
    if (!window.confirm(`Alle Tage als „${CATEGORY_LABELS[category]}“ markieren?`)) return;
    setEntries((prev) => prev.map((e) => ({ ...e, category, hours: NON_WORK.includes(category) ? 0 : e.hours || 8 })));
    setDirty(true);
  };
  const copyPrevious = (idx: number) => {
    if (idx === 0) return;
    const prev = entries[idx - 1];
    update(entries[idx].id, { description: prev.description, category: prev.category, hours: prev.hours });
  };
  const applyTemplate = (id: string, t: EditorTemplate) => {
    const cur = entries.find((e) => e.id === id);
    const description = cur?.description ? `${cur.description}\n${t.content}` : t.content;
    update(id, { description, category: t.category, hours: NON_WORK.includes(t.category) ? 0 : cur?.hours || 8 });
    setTplFor(null);
  };

  const total = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
  const words = entries.reduce((s, e) => s + e.description.trim().split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <p><span className="font-medium text-slate-700">{total.toLocaleString("de-DE")} h</span> · {words} Wörter</p>
          {entries.length > 1 && (
            <select aria-label="Alle Tage markieren als" value="" onChange={(ev) => { if (ev.target.value) markAll(ev.target.value as EntryCategory); }} className="input w-auto py-1 text-xs">
              <option value="">Alle Tage als …</option>
              {(["URLAUB", "KRANK", "BERUFSSCHULE", "SEMINAR", "BETRIEB"] as EntryCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {status === "saving" && <span className="flex items-center gap-1 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Speichert …</span>}
          {status === "saved" && !dirty && <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3.5 w-3.5" /> {savedMsg}</span>}
          {status === "error" && <span className="text-red-600">{error}</span>}
          {dirty && status !== "saving" && <span className="text-amber-600">Ungespeichert</span>}
          <Button size="sm" variant="outline" type="button" onClick={persist} disabled={status === "saving" || submitting}><CloudUpload className="h-3.5 w-3.5" /> Speichern</Button>
          {!staff && <Button size="sm" variant="success" type="button" onClick={submit} disabled={submitting}>{submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Zur Prüfung einreichen</Button>}
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((e, idx) => {
          const nonWork = NON_WORK.includes(e.category);
          return (
            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{weekdays[idx]}</p>
                  <p className="text-xs text-slate-500">{e.date}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={e.category} onChange={(ev) => setCategory(e.id, ev.target.value as EntryCategory)} className="input w-auto py-1.5 text-xs">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input type="number" min={0} max={24} step={0.25} value={e.hours} onChange={(ev) => update(e.id, { hours: Number(ev.target.value) })} className="input w-20 py-1.5 text-xs" disabled={nonWork} />
                    h
                  </label>
                  {idx > 0 && <button type="button" onClick={() => copyPrevious(idx)} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Wie Vortag</button>}
                  {templates.length > 0 && (
                    <div className="relative">
                      <button type="button" onClick={() => setTplFor(tplFor === e.id ? null : e.id)} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-brand-50", tplFor === e.id ? "bg-brand-50 text-brand-700" : "text-brand-600")}>
                        <Sparkles className="h-3.5 w-3.5" /> Textbaustein
                      </button>
                      {tplFor === e.id && (
                        <div className="absolute right-0 z-20 mt-1 max-h-64 w-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                          {templates.map((t) => (
                            <button key={t.id} type="button" onClick={() => applyTemplate(e.id, t)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                              <p className="text-sm font-medium text-slate-800">{t.title}</p>
                              <p className="line-clamp-2 text-xs text-slate-500">{t.content}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <textarea
                value={e.description}
                onChange={(ev) => update(e.id, { description: ev.target.value })}
                rows={nonWork ? 1 : 4}
                maxLength={4000}
                placeholder={nonWork ? `${CATEGORY_LABELS[e.category]} – optional Bemerkung` : "Was hast du heute gemacht? Tätigkeiten, Unterweisungen, Lerninhalte …"}
                className="input resize-y"
              />
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="label" htmlFor="summary">Wochenzusammenfassung (optional)</label>
        <textarea id="summary" value={summary} onChange={(ev) => { setSummary(ev.target.value); setDirty(true); }} rows={3} maxLength={2000} className="input" placeholder="Was war diese Woche besonders? Was hast du gelernt?" />
      </div>
    </div>
  );
}
