import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reportScope } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const att = await db.attachment.findFirst({ where: { id, report: reportScope(me) } });
  if (!att) return new NextResponse("Not found", { status: 404 });
  const inline = att.mimeType.startsWith("image/") || att.mimeType === "application/pdf";
  return new NextResponse(new Uint8Array(att.data), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Length": String(att.size),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
      "Cache-Control": "private, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
