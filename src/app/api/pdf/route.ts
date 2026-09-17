import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { renderReportsPdf } from "@/lib/pdf";
import { reportTitle } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * PDF-Export.
 *  ?report=<id>                  → einzelner Bericht (Woche oder Tag)
 *  ?azubi=<id>[&year=YYYY][&from=YYYY-MM-DD&to=YYYY-MM-DD][&status=APPROVED]  → ganzes Berichtsheft
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  const sp = req.nextUrl.searchParams;
  const include = { entries: { orderBy: { sortOrder: "asc" as const } }, reviewer: { select: { firstName: true, lastName: true } }, department: { select: { name: true } } };

  let where: Prisma.ReportWhereInput;
  let single = false;
  if (sp.get("report")) {
    where = { id: sp.get("report")!, ...reportScope(me) };
    single = true;
  } else {
    const azubiId = me.role === "AZUBI" ? me.id : sp.get("azubi");
    if (!azubiId) return new NextResponse("azubi fehlt", { status: 400 });
    where = { azubiId, ...reportScope(me) };
    if (sp.get("year")) where.year = Number(sp.get("year"));
    if (sp.get("from") || sp.get("to")) where.weekStart = { ...(sp.get("from") ? { gte: new Date(sp.get("from")!) } : {}), ...(sp.get("to") ? { lte: new Date(sp.get("to")!) } : {}) };
    if (sp.get("status") === "APPROVED") where.status = "APPROVED";
    else if (me.role === "AZUBI") where.status = { not: "DRAFT" };
  }
  const reports = await db.report.findMany({ where, include, orderBy: [{ year: "asc" }, { week: "asc" }, { day: "asc" }], take: 400 });
  if (!reports.length) return new NextResponse("Keine Berichte gefunden", { status: 404 });
  const azubi = await db.user.findUniqueOrThrow({
    where: { id: reports[0].azubiId },
    select: { firstName: true, lastName: true, beruf: true, email: true, ausbildungsbeginn: true, ausbildungsende: true, trainer: { select: { firstName: true, lastName: true } }, department: { select: { name: true } } },
  });
  const pdf = await renderReportsPdf(azubi, reports, !single);
  await audit(me.id, "EXPORT_PDF", "Report", single ? reports[0].id : null, { azubiId: reports[0].azubiId, count: reports.length });
  const name = single ? `${slug(reportTitle(reports[0]))}-${slug(azubi.lastName)}.pdf` : `Berichtsheft-${slug(azubi.lastName)}-${slug(azubi.firstName)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `${sp.get("inline") ? "inline" : "attachment"}; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
