import "server-only";

/**
 * E-Mail-Versand über Resend (https://resend.com) – optional.
 * Ohne RESEND_API_KEY werden Mails still übersprungen (In-App-Mitteilungen funktionieren immer).
 */
export const mailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

export async function sendMail(to: string | null | undefined, subject: string, html: string, text?: string) {
  if (!to || !mailEnabled()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, html, text: text ?? html.replace(/<[^>]+>/g, "") }),
    });
    if (!res.ok) console.error("sendMail failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("sendMail error", e);
    return false;
  }
}

export function appUrl(path = "") {
  const base = process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
}

export function mailLayout(companyName: string, title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#f1f5f9;font-family:Inter,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#1f3fe6;color:#fff;padding:20px 28px;font-weight:600;font-size:16px">${companyName} · Berichtsheft</div>
    <div style="padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      <div style="font-size:15px;line-height:1.6">${body}</div>
      ${cta ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="display:inline-block;background:#1f3fe6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${cta.label}</a></p>` : ""}
    </div>
    <div style="padding:16px 28px;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0">Diese Nachricht wurde automatisch vom Berichtsheft-System gesendet.</div>
  </div></body></html>`;
}
