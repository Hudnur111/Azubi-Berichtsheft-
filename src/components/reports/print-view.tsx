import type { Department, Report, ReportEntry, User } from "@prisma/client";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { fmtDate, reportTitle, weekdayLong, weekLabel } from "@/lib/dates";
import { fullName } from "@/lib/utils";
import { PrintButton } from "./print-button";

type Props = {
  report: Report & { entries: ReportEntry[]; azubi: User & { trainer: User | null }; reviewer: User | null; department: Department | null };
};

export function PrintView({ report }: Props) {
  const total = report.entries.reduce((s, e) => s + Number(e.hours), 0);
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>
      <header className="border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-bold">Ausbildungsnachweis (Berichtsheft)</h1>
        <p className="text-sm text-slate-600">{report.type === "DAILY" ? "Täglicher" : "Wöchentlicher"} Nachweis gemäß § 13 Nr. 7 BBiG · {reportTitle(report)}</p>
      </header>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div><dt className="text-xs uppercase text-slate-500">Auszubildende/r</dt><dd className="font-medium">{fullName(report.azubi)}</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Ausbildungsberuf</dt><dd className="font-medium">{report.azubi.beruf ?? "–"}</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Ausbildungsjahr</dt><dd className="font-medium">{report.ausbildungsjahr ?? "–"}</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Abteilung</dt><dd className="font-medium">{report.department?.name ?? "–"}</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Zeitraum</dt><dd className="font-medium">{weekLabel(report.year, report.week)} · {fmtDate(report.weekStart)} – {fmtDate(report.weekEnd)}</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Status</dt><dd className="font-medium">{STATUS_LABELS[report.status]}</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Ausbilder/in</dt><dd className="font-medium">{report.azubi.trainer ? fullName(report.azubi.trainer) : "–"}</dd></div>
        <div><dt className="text-xs uppercase text-slate-500">Geprüft von</dt><dd className="font-medium">{report.reviewer ? `${fullName(report.reviewer)} (${fmtDate(report.reviewedAt)})` : "–"}</dd></div>
      </dl>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-900 text-left">
            <th className="py-2 pr-2">Tag</th><th className="py-2 pr-2">Art</th><th className="py-2 pr-2">Ausgeführte Tätigkeiten / Unterweisungen / Unterricht</th><th className="py-2 text-right">Std.</th>
          </tr>
        </thead>
        <tbody>
          {report.entries.map((e) => (
            <tr key={e.id} className="border-b border-slate-200 align-top">
              <td className="py-2 pr-2 whitespace-nowrap">{weekdayLong(new Date(e.date))}<br /><span className="text-xs text-slate-500">{fmtDate(e.date)}</span></td>
              <td className="py-2 pr-2 whitespace-nowrap">{CATEGORY_LABELS[e.category]}</td>
              <td className="py-2 pr-2 whitespace-pre-wrap">{e.description}</td>
              <td className="py-2 text-right tabular-nums">{Number(e.hours).toLocaleString("de-DE")}</td>
            </tr>
          ))}
          <tr className="font-semibold"><td colSpan={3} className="py-2">Gesamtstunden</td><td className="py-2 text-right tabular-nums">{total.toLocaleString("de-DE")}</td></tr>
        </tbody>
      </table>
      {report.summary && (
        <div className="mt-4 text-sm"><p className="text-xs uppercase text-slate-500">Wochenzusammenfassung</p><p className="whitespace-pre-wrap">{report.summary}</p></div>
      )}
      <div className="mt-12 grid grid-cols-2 gap-12 text-xs text-slate-600">
        <div className="border-t border-slate-900 pt-2">Datum / Unterschrift Auszubildende/r{report.submittedAt && <><br />elektronisch eingereicht am {fmtDate(report.submittedAt)}</>}</div>
        <div className="border-t border-slate-900 pt-2">Datum / Unterschrift Ausbilder/in{report.status === "APPROVED" && report.reviewer && <><br />elektronisch genehmigt am {fmtDate(report.reviewedAt)} durch {fullName(report.reviewer)}</>}</div>
      </div>
    </div>
  );
}
