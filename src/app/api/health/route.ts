import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", portal: process.env.PORTAL_MODE ?? "both", time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ status: "error", message: (e as Error).message }, { status: 503 });
  }
}
