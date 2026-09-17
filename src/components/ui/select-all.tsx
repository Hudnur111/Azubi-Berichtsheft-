"use client";
/** Checkbox, die alle Checkboxen gleichen Namens im umgebenden Formular setzt. */
export function SelectAll({ name }: { name: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Alle auswählen"
      className="h-4 w-4 rounded border-slate-300"
      onChange={(e) => {
        const form = e.currentTarget.form;
        form?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]`).forEach((c) => { c.checked = e.currentTarget.checked; });
      }}
    />
  );
}
