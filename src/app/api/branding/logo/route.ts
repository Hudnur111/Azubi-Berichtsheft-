import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await db.appSetting.findUnique({ where: { id: "default" }, select: { logoData: true, logoMime: true } });
  if (!s?.logoData || !s.logoMime) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(s.logoData), { headers: { "Content-Type": s.logoMime, "Cache-Control": "public, max-age=3600" } });
}
