import { addComment } from "@/actions/reports";
import { SubmitButton } from "@/components/ui/submit-button";

export function CommentForm({ reportId }: { reportId: string }) {
  return (
    <form action={addComment} className="space-y-2">
      <input type="hidden" name="reportId" value={reportId} />
      <textarea name="text" rows={2} required maxLength={4000} className="input" placeholder="Kommentar oder Rückfrage schreiben …" />
      <div className="flex justify-end"><SubmitButton size="sm" variant="outline">Kommentar senden</SubmitButton></div>
    </form>
  );
}
