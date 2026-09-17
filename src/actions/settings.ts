"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { BUNDESLAENDER } from "@/lib/settings";

const enc = encodeURIComponent;
const schema = z.object({
  companyName: z.string().trim().min(2, "Firmenname zu kurz.").max(100),
  supportEmail: z.string().trim().toLowerCase().email("Ungültige Support-E-Mail.").optional().or(z.literal("")),
  bundesland: z.string().optional().transform((v) => (v && (v in BUNDESLAENDER || v === "DE") ? v : "BW")),
  impressum: z.string().max(20000).optional(),
  datenschutz: z.string().max(40000).optional(),
});

export async function saveSettings(formData: FormData) {
  const me = await requireRole("ADMIN");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/einstellungen?error=${enc(parsed.error.issues[0]?.message ?? "Ungültig")}`);
  const d = parsed.data;
  const data = { companyName: d.companyName, supportEmail: d.supportEmail || null, bundesland: d.bundesland, impressum: d.impressum?.trim() || null, datenschutz: d.datenschutz?.trim() || null };
  await db.appSetting.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  await audit(me.id, "SETTINGS_UPDATED", "AppSetting", "default", { companyName: d.companyName, bundesland: d.bundesland });
  revalidatePath("/", "layout");
  redirect("/admin/einstellungen?ok=Einstellungen+gespeichert");
}

export async function uploadLogo(formData: FormData) {
  const me = await requireRole("ADMIN");
  const file = formData.get("logo");
  if (!(file instanceof File) || !file.size) redirect(`/admin/einstellungen?error=${enc("Keine Datei ausgewählt.")}`);
  if (file.size > 1024 * 1024) redirect(`/admin/einstellungen?error=${enc("Logo zu groß (max. 1 MB).")}`);
  if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) redirect(`/admin/einstellungen?error=${enc("Bitte PNG, JPG, SVG oder WebP.")}`);
  const logoData = Buffer.from(await file.arrayBuffer());
  await db.appSetting.upsert({ where: { id: "default" }, update: { logoData, logoMime: file.type }, create: { id: "default", logoData, logoMime: file.type } });
  await audit(me.id, "LOGO_UPDATED", "AppSetting", "default", { size: file.size, type: file.type });
  revalidatePath("/", "layout");
  redirect("/admin/einstellungen?ok=Logo+aktualisiert");
}

export async function removeLogo() {
  const me = await requireRole("ADMIN");
  await db.appSetting.upsert({ where: { id: "default" }, update: { logoData: null, logoMime: null }, create: { id: "default" } });
  await audit(me.id, "LOGO_REMOVED", "AppSetting", "default");
  revalidatePath("/", "layout");
  redirect("/admin/einstellungen?ok=Logo+entfernt");
}
