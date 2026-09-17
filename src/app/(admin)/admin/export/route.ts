import { NextResponse, type NextRequest } from "next/server";
import type { ReportStatus } from "@prisma/client";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { fmtDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || !isStaff(me.role)) return new NextResponse("Unauthorized", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as ReportStatus | null;
  const where = {
    ...reportScope(me),
    ...(status && status in STATUS_LABELS ? { status } : {}),
    ...(sp.get("azubi") ? { azubiId: sp.get("azubi")! } : {}),
    ...(sp.get("dept") ? { departmentId: sp.get("dept")! } : {}),
  };
  const reports = await db.report.findMany({
    where, orderBy: [{ azubiId: "asc" }, { year: "asc" }, { week: "asc" }], take: 5000,
    include: { entries: { orderBy: { sortOrder: "asc" } }, azubi: { select: { firstName: true, lastName: true, email: true } }, department: { select: { name: true } }, reviewer: { select: { firstName: true, lastName: true } } },
  });
  const header = ["Azubi", "E-Mail", "Jahr", "KW", "Datum", "Wochentag", "Kategorie", "Tätigkeit", "Stunden", "Abteilung", "Status", "Eingereicht", "Geprüft von", "Geprüft am"];
  const lines = [header.map(csvCell).join(";")];
  for (const r of reports) {
    for (const e of r.entries) {
      lines.push([
        `${r.azubi.firstName} ${r.azubi.lastName}`, r.azubi.email, r.year, r.week, fmtDate(e.date), fmtDate(e.date, "EEEE"), CATEGORY_LABELS[e.category], e.description, Number(e.hours).toLocaleString("de-DE"),
        r.department?.name ?? "", STATUS_LABELS[r.status], r.submittedAt ? fmtDate(r.submittedAt, "dd.MM.yyyy HH:mm") : "", r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : "", r.reviewedAt ? fmtDate(r.reviewedAt, "dd.MM.yyyy HH:mm") : "",
      ].map(csvCell).join(";"));
    }
  }
  await audit(me.id, "EXPORT_CSV", "Report", null, { count: reports.length });
  const body = "﻿" + lines.join("\r\n");
  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="berichtsheft-export-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
