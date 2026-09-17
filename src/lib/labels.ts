import type { EntryCategory, ReportStatus } from "@prisma/client";

export const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: "Entwurf",
  SUBMITTED: "Eingereicht",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
};

export const STATUS_TONE: Record<ReportStatus, "neutral" | "info" | "success" | "danger"> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

export const CATEGORY_LABELS: Record<EntryCategory, string> = {
  BETRIEB: "Betrieb",
  BERUFSSCHULE: "Berufsschule",
  SEMINAR: "Seminar / Schulung",
  URLAUB: "Urlaub",
  KRANK: "Krank",
  FEIERTAG: "Feiertag",
  SONSTIGES: "Sonstiges",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as EntryCategory[];
