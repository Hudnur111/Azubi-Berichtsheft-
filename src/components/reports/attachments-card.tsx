import { FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import type { Attachment } from "@prisma/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { deleteAttachment, uploadAttachment } from "@/actions/reports";
import { fmtDateTime } from "@/lib/dates";

const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export function AttachmentsCard({ reportId, attachments, canUpload, meId, isAdmin, locked }: {
  reportId: string; attachments: (Omit<Attachment, "data"> & { uploadedBy?: { firstName: string; lastName: string } | null })[]; canUpload: boolean; meId: string; isAdmin: boolean; locked: boolean;
}) {
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-slate-400" /> Anhänge</span>} description={`${attachments.length}/10 · Bilder, PDF, Office, max. 4 MB`} />
      {attachments.length ? (
        <ul className="divide-y divide-slate-100">
          {attachments.map((a) => {
            const Icon = a.mimeType.startsWith("image/") ? ImageIcon : FileText;
            const canDelete = isAdmin || (a.uploadedById === meId && !locked);
            return (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <Icon className="h-5 w-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <a href={`/api/attachments/${a.id}`} target="_blank" rel="noopener" className="block truncate text-sm font-medium text-brand-600 hover:underline">{a.filename}</a>
                  <p className="text-xs text-slate-500">{fmtSize(a.size)} · {fmtDateTime(a.createdAt)}{a.uploadedBy && ` · ${a.uploadedBy.firstName} ${a.uploadedBy.lastName}`}</p>
                </div>
                {canDelete && (
                  <ConfirmForm action={deleteAttachment} confirm={`„${a.filename}“ löschen?`}><input type="hidden" name="id" value={a.id} /><button className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Löschen"><Trash2 className="h-4 w-4" /></button></ConfirmForm>
                )}
              </li>
            );
          })}
        </ul>
      ) : <CardBody className="text-sm text-slate-400">Keine Anhänge.</CardBody>}
      {canUpload && attachments.length < 10 && (
        <CardBody className="border-t border-slate-100">
          <form action={uploadAttachment} className="flex flex-wrap items-center gap-2" encType="multipart/form-data">
            <input type="hidden" name="reportId" value={reportId} />
            <input type="file" name="file" required accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx" className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200" />
            <SubmitButton size="sm" variant="outline" pendingText="Lädt hoch …"><Upload className="h-4 w-4" /> Hochladen</SubmitButton>
          </form>
        </CardBody>
      )}
    </Card>
  );
}
