import "server-only";
import { cache } from "react";
import { db } from "./db";

export const DEFAULT_COMPANY = "Azubi-Berichtsheft";

export const getSettings = cache(async () => {
  try {
    const s = await db.appSetting.findUnique({ where: { id: "default" }, select: { companyName: true, logoMime: true, impressum: true, datenschutz: true, bundesland: true, supportEmail: true, updatedAt: true } });
    return { companyName: s?.companyName ?? DEFAULT_COMPANY, hasLogo: !!s?.logoMime, impressum: s?.impressum ?? null, datenschutz: s?.datenschutz ?? null, bundesland: s?.bundesland ?? "BW", supportEmail: s?.supportEmail ?? null, logoVersion: s?.updatedAt?.getTime() ?? 0 };
  } catch {
    return { companyName: DEFAULT_COMPANY, hasLogo: false, impressum: null, datenschutz: null, bundesland: "BW", supportEmail: null, logoVersion: 0 };
  }
});

export const BUNDESLAENDER: Record<string, string> = {
  BW: "Baden-Württemberg", BY: "Bayern", BE: "Berlin", BB: "Brandenburg", HB: "Bremen", HH: "Hamburg", HE: "Hessen", MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen", NW: "Nordrhein-Westfalen", RP: "Rheinland-Pfalz", SL: "Saarland", SN: "Sachsen", ST: "Sachsen-Anhalt", SH: "Schleswig-Holstein", TH: "Thüringen",
};
