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
