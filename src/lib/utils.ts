export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`;

export const initials = (u: { firstName: string; lastName: string }) =>
  `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

export function portalMode(): "azubi" | "admin" | "both" {
  const m = (process.env.PORTAL_MODE ?? "both").toLowerCase();
  return m === "azubi" || m === "admin" ? m : "both";
}

export const loginGroupFor = (role: "ADMIN" | "AUSBILDER" | "ABTEILUNGSLEITER" | "AZUBI") => (role === "AZUBI" ? "AZUBI" : "STAFF");

/** 8-stelliger Einladungscode ohne verwechselbare Zeichen (0/O, 1/I). */
export function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export const usernameRegex = /^[a-zA-Z0-9._-]{3,32}$/;
