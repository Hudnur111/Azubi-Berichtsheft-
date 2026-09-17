import { Trash2 } from "lucide-react";
import type { Template } from "@prisma/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { Empty } from "@/components/ui/empty";
import { deleteTemplate, saveTemplate } from "@/actions/reports";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/labels";

export function TemplateManager({ templates, meId, isStaff, departments }: {
  templates: (Template & { department?: { name: string } | null })[]; meId: string; isStaff: boolean; departments?: { id: string; name: string }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Textbausteine" description="Wiederkehrende Tätigkeiten mit einem Klick einfügen." />
        {templates.length ? (
          <ul className="divide-y divide-slate-100">
            {templates.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{t.title} <Badge className="ml-1">{CATEGORY_LABELS[t.category]}</Badge> {t.isGlobal && <Badge tone="brand" className="ml-1">Global</Badge>} {t.department && <Badge tone="info" className="ml-1">{t.department.name}</Badge>}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{t.content}</p>
                </div>
                {(t.ownerId === meId || isStaff) && (
                  <ConfirmForm action={deleteTemplate} confirm="Textbaustein löschen?"><input type="hidden" name="id" value={t.id} /><button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Löschen"><Trash2 className="h-4 w-4" /></button></ConfirmForm>
                )}
              </li>
            ))}
          </ul>
        ) : <Empty title="Noch keine Textbausteine" description="Erstelle rechts deinen ersten Baustein." />}
      </Card>
      <Card>
        <CardHeader title="Neuer Textbaustein" />
        <CardBody>
          <form action={saveTemplate} className="space-y-3">
            <div><label className="label" htmlFor="title">Titel</label><input id="title" name="title" className="input" required maxLength={120} placeholder="z. B. Kundenanfragen bearbeiten" /></div>
            <div><label className="label" htmlFor="category">Kategorie</label><select id="category" name="category" className="input">{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></div>
            <div><label className="label" htmlFor="content">Text</label><textarea id="content" name="content" rows={4} className="input" required maxLength={4000} /></div>
            {isStaff && (
              <>
                <div><label className="label" htmlFor="departmentId">Für Abteilung (optional)</label><select id="departmentId" name="departmentId" className="input"><option value="">– keine –</option>{departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isGlobal" className="h-4 w-4 rounded border-slate-300" /> Für alle Azubis sichtbar</label>
              </>
            )}
            <SubmitButton className="w-full">Speichern</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
