import { ImageOff, Upload } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { BUNDESLAENDER, getSettings } from "@/lib/settings";
import { mailEnabled } from "@/lib/mail";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/toast";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { Badge } from "@/components/ui/badge";
import { removeLogo, saveSettings, uploadLogo } from "@/actions/settings";

export default async function EinstellungenPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const s = await getSettings();
  const env = [
    ["Datenbank", !!process.env.DATABASE_URL], ["AUTH_SECRET", (process.env.AUTH_SECRET ?? "").length >= 32], ["E-Mail-Versand (RESEND_API_KEY + MAIL_FROM)", mailEnabled()],
    ["Cron-Schutz (CRON_SECRET)", !!process.env.CRON_SECRET], ["APP_URL (für Links in E-Mails)", !!process.env.APP_URL || !!process.env.VERCEL_PROJECT_PRODUCTION_URL],
  ] as const;
  return (
    <>
      <PageHeader title="Einstellungen" description="Firmendaten, Logo, Feiertage und rechtliche Texte." />
      <QueryToast ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Firma & Texte" />
          <CardBody>
            <form action={saveSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="companyName">Firmen-/Organisationsname</label><input id="companyName" name="companyName" defaultValue={s.companyName} required className="input" /></div>
                <div><label className="label" htmlFor="supportEmail">Support-E-Mail (optional)</label><input id="supportEmail" name="supportEmail" type="email" defaultValue={s.supportEmail ?? ""} className="input" /></div>
                <div>
                  <label className="label" htmlFor="bundesland">Bundesland (Feiertage)</label>
                  <select id="bundesland" name="bundesland" defaultValue={s.bundesland} className="input">{Object.entries(BUNDESLAENDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="DE">Nur bundesweite Feiertage</option></select>
                  <p className="mt-1 text-xs text-slate-500">Standard: Baden-Württemberg (inkl. Heilige Drei Könige, Fronleichnam, Allerheiligen). Feiertage werden in neuen Berichten vorbelegt und im Kalender angezeigt.</p>
                </div>
              </div>
              <div><label className="label" htmlFor="impressum">Impressum</label><textarea id="impressum" name="impressum" rows={6} defaultValue={s.impressum ?? ""} className="input font-mono text-xs" placeholder="Firma, Anschrift, Vertretungsberechtigte, Kontakt, Registereintrag, USt-ID …" /></div>
              <div><label className="label" htmlFor="datenschutz">Datenschutzerklärung</label><textarea id="datenschutz" name="datenschutz" rows={10} defaultValue={s.datenschutz ?? ""} className="input font-mono text-xs" placeholder="Verantwortlicher, Zwecke der Verarbeitung (Ausbildungsnachweis nach BBiG), Speicherdauer, Rechte der Betroffenen …" /></div>
              <SubmitButton pendingText="Speichern …">Speichern</SubmitButton>
            </form>
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Logo" description="PNG, JPG, SVG oder WebP · max. 1 MB · quadratisch empfohlen" />
            <CardBody className="space-y-4">
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                {s.hasLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/branding/logo?v=${s.logoVersion}`} alt="Logo" className="max-h-24 max-w-[80%] object-contain" />
                ) : <span className="flex items-center gap-2 text-sm text-slate-400"><ImageOff className="h-4 w-4" /> Noch kein Logo</span>}
              </div>
              <form action={uploadLogo} className="space-y-2" encType="multipart/form-data">
                <input type="file" name="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" required className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium" />
                <SubmitButton size="sm" variant="outline" className="w-full" pendingText="Lädt hoch …"><Upload className="h-4 w-4" /> Logo hochladen</SubmitButton>
              </form>
              {s.hasLogo && <ConfirmForm action={removeLogo} confirm="Logo entfernen?" className="block"><SubmitButton size="sm" variant="ghost" className="w-full text-red-600">Logo entfernen</SubmitButton></ConfirmForm>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Systemstatus" description="Konfiguration der Umgebung" />
            <ul className="divide-y divide-slate-100 text-sm">
              {env.map(([k, ok]) => <li key={k} className="flex items-center justify-between px-5 py-2"><span>{k}</span>{ok ? <Badge tone="success">ok</Badge> : <Badge tone="warning">fehlt</Badge>}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
