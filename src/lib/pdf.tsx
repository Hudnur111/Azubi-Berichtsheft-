import "server-only";
import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Department, Report, ReportEntry, User } from "@prisma/client";
import { CATEGORY_LABELS, STATUS_LABELS } from "./labels";
import { fmtDate, reportTitle, weekdayLong } from "./dates";
import { fullName } from "./utils";

export type PdfReport = Report & {
  entries: ReportEntry[];
  reviewer: Pick<User, "firstName" | "lastName"> | null;
  department: Pick<Department, "name"> | null;
};
export type PdfAzubi = Pick<User, "firstName" | "lastName" | "beruf" | "email" | "username" | "ausbildungsbeginn" | "ausbildungsende"> & {
  trainer: Pick<User, "firstName" | "lastName"> | null;
  department: Pick<Department, "name"> | null;
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a" },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 8.5, color: "#475569", marginTop: 2 },
  head: { borderBottomWidth: 1.5, borderBottomColor: "#0f172a", paddingBottom: 8, marginBottom: 10 },
  meta: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  metaItem: { width: "25%", marginBottom: 5 },
  label: { fontSize: 7, color: "#64748b", textTransform: "uppercase" },
  val: { fontFamily: "Helvetica-Bold" },
  thead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#0f172a", paddingBottom: 3, marginBottom: 2 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#cbd5e1", paddingVertical: 4 },
  cDay: { width: "17%" }, cCat: { width: "15%" }, cText: { width: "58%", paddingRight: 6 }, cH: { width: "10%", textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  small: { fontSize: 7.5, color: "#64748b" },
  sig: { flexDirection: "row", marginTop: 34, justifyContent: "space-between" },
  sigBox: { width: "45%", borderTopWidth: 1, borderTopColor: "#0f172a", paddingTop: 4, fontSize: 7.5, color: "#475569" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#94a3b8" },
  cover: { padding: 60, fontFamily: "Helvetica", color: "#0f172a" },
  toc: { marginTop: 20 },
  tocRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 3, fontSize: 9 },
});

function ReportPage({ r, azubi, nr }: { r: PdfReport; azubi: PdfAzubi; nr?: number }) {
  const total = r.entries.reduce((a, e) => a + Number(e.hours), 0);
  const meta: [string, string][] = [
    ["Auszubildende/r", fullName(azubi)], ["Ausbildungsberuf", azubi.beruf ?? "–"], ["Ausbildungsjahr", r.ausbildungsjahr ? String(r.ausbildungsjahr) : "–"], ["Abteilung", r.department?.name ?? "–"],
    ["Zeitraum", r.type === "DAILY" ? fmtDate(r.weekStart) : `${reportTitle(r)} · ${fmtDate(r.weekStart)} – ${fmtDate(r.weekEnd)}`], ["Status", STATUS_LABELS[r.status]],
    ["Ausbilder/in", azubi.trainer ? fullName(azubi.trainer) : "–"], ["Geprüft", r.reviewer ? `${fullName(r.reviewer)} · ${fmtDate(r.reviewedAt)}` : "–"],
  ];
  return (
    <Page size="A4" style={s.page} wrap>
      <View style={s.head}>
        <Text style={s.h1}>Ausbildungsnachweis{nr ? ` Nr. ${nr}` : ""} · {reportTitle(r)}</Text>
        <Text style={s.sub}>{r.type === "DAILY" ? "Täglicher" : "Wöchentlicher"} Nachweis gemäß § 13 Nr. 7 BBiG</Text>
      </View>
      <View style={s.meta}>
        {meta.map(([k, v]) => (
          <View key={k} style={s.metaItem}><Text style={s.label}>{k}</Text><Text style={s.val}>{v}</Text></View>
        ))}
      </View>
      <View style={s.thead}>
        <Text style={[s.cDay, s.bold]}>Tag</Text><Text style={[s.cCat, s.bold]}>Art</Text><Text style={[s.cText, s.bold]}>Tätigkeiten / Unterweisungen / Unterricht</Text><Text style={[s.cH, s.bold]}>Std.</Text>
      </View>
      {r.entries.map((e) => (
        <View key={e.id} style={s.row} wrap={false}>
          <View style={s.cDay}><Text>{weekdayLong(new Date(e.date))}</Text><Text style={s.small}>{fmtDate(e.date)}</Text></View>
          <Text style={s.cCat}>{CATEGORY_LABELS[e.category]}</Text>
          <Text style={s.cText}>{e.description || "–"}</Text>
          <Text style={s.cH}>{Number(e.hours).toLocaleString("de-DE")}</Text>
        </View>
      ))}
      <View style={[s.row, { borderBottomWidth: 0 }]}>
        <Text style={[s.cDay, s.bold]}>Gesamt</Text><Text style={s.cCat} /><Text style={s.cText} /><Text style={[s.cH, s.bold]}>{total.toLocaleString("de-DE")}</Text>
      </View>
      {r.summary ? (
        <View style={{ marginTop: 10 }}><Text style={s.label}>Zusammenfassung</Text><Text>{r.summary}</Text></View>
      ) : null}
      {r.reviewNote ? (
        <View style={{ marginTop: 8 }}><Text style={s.label}>Anmerkung Ausbilder/in</Text><Text>{r.reviewNote}</Text></View>
      ) : null}
      <View style={s.sig}>
        <View style={s.sigBox}><Text>Datum / Unterschrift Auszubildende/r</Text>{r.submittedAt ? <Text>elektronisch eingereicht am {fmtDate(r.submittedAt)}</Text> : null}</View>
        <View style={s.sigBox}><Text>Datum / Unterschrift Ausbilder/in</Text>{r.status === "APPROVED" && r.reviewer ? <Text>elektronisch genehmigt am {fmtDate(r.reviewedAt)} durch {fullName(r.reviewer)}</Text> : null}</View>
      </View>
      <View style={s.footer} fixed>
        <Text>{fullName(azubi)} · {reportTitle(r)}</Text>
        <Text render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

function Cover({ azubi, reports }: { azubi: PdfAzubi; reports: PdfReport[] }) {
  const approved = reports.filter((r) => r.status === "APPROVED").length;
  const hours = reports.reduce((a, r) => a + r.entries.reduce((b, e) => b + Number(e.hours), 0), 0);
  return (
    <Page size="A4" style={s.cover}>
      <Text style={{ fontSize: 24, fontFamily: "Helvetica-Bold" }}>Berichtsheft</Text>
      <Text style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Ausbildungsnachweise gemäß § 13 Nr. 7 BBiG</Text>
      <View style={{ marginTop: 30 }}>
        {([["Auszubildende/r", fullName(azubi)], ["Benutzername", azubi.username], ["E-Mail", azubi.email ?? "–"], ["Ausbildungsberuf", azubi.beruf ?? "–"], ["Ausbildungszeitraum", `${fmtDate(azubi.ausbildungsbeginn)} – ${fmtDate(azubi.ausbildungsende)}`], ["Stammabteilung", azubi.department?.name ?? "–"], ["Ausbilder/in", azubi.trainer ? fullName(azubi.trainer) : "–"], ["Berichte", `${reports.length} (davon ${approved} genehmigt)`], ["Dokumentierte Stunden", hours.toLocaleString("de-DE")], ["Erstellt am", fmtDate(new Date(), "dd.MM.yyyy HH:mm")]] as [string, string][]).map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", marginBottom: 6 }}><Text style={{ width: 150, color: "#64748b" }}>{k}</Text><Text style={s.bold}>{v}</Text></View>
        ))}
      </View>
      <View style={s.toc}>
        <Text style={[s.bold, { marginBottom: 6, fontSize: 11 }]}>Inhalt</Text>
        {reports.map((r, i) => (
          <View key={r.id} style={s.tocRow}><Text>Nr. {i + 1} · {reportTitle(r)} · {r.department?.name ?? "–"}</Text><Text>{STATUS_LABELS[r.status]}</Text></View>
        ))}
      </View>
    </Page>
  );
}

export async function renderReportsPdf(azubi: PdfAzubi, reports: PdfReport[], withCover: boolean) {
  const doc = (
    <Document title={`Berichtsheft ${fullName(azubi)}`} author={fullName(azubi)} language="de">
      {withCover ? <Cover azubi={azubi} reports={reports} /> : null}
      {reports.map((r, i) => <ReportPage key={r.id} r={r} azubi={azubi} nr={withCover ? i + 1 : undefined} />)}
    </Document>
  );
  return renderToBuffer(doc);
}
