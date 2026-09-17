import type { Prisma, Role } from "@prisma/client";
import type { CurrentUser } from "./auth";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  AUSBILDER: "Ausbilder/in",
  ABTEILUNGSLEITER: "Abteilungsleiter/in",
  AZUBI: "Auszubildende/r",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Vollzugriff: Benutzer, Abteilungen, Rollen, alle Berichte, Audit-Log.",
  AUSBILDER: "Prüft Berichte der zugewiesenen Azubis und der eigenen Abteilung.",
  ABTEILUNGSLEITER: "Prüft Berichte der Azubis, die aktuell in der eigenen Abteilung eingesetzt sind.",
  AZUBI: "Schreibt Berichte und reicht sie zur Prüfung ein.",
};

/** Prisma-Filter: Welche Azubis darf ein Staff-Nutzer sehen/prüfen? */
export function azubiScope(user: CurrentUser): Prisma.UserWhereInput {
  if (user.role === "ADMIN") return { role: "AZUBI" };
  if (user.role === "AUSBILDER") {
    return {
      role: "AZUBI",
      OR: [
        { trainerId: user.id },
        ...(user.departmentId ? [{ departmentId: user.departmentId }] : []),
      ],
    };
  }
  if (user.role === "ABTEILUNGSLEITER") {
    if (!user.departmentId) return { id: "__none__" };
    const now = new Date();
    return {
      role: "AZUBI",
      OR: [
        { departmentId: user.departmentId },
        { rotations: { some: { departmentId: user.departmentId, startDate: { lte: now }, endDate: { gte: now } } } },
      ],
    };
  }
  return { id: user.id };
}

/** Prisma-Filter: Welche Berichte darf ein Nutzer sehen? */
export function reportScope(user: CurrentUser): Prisma.ReportWhereInput {
  if (user.role === "AZUBI") return { azubiId: user.id };
  if (user.role === "ADMIN") return {};
  if (user.role === "ABTEILUNGSLEITER") {
    if (!user.departmentId) return { id: "__none__" };
    return {
      OR: [
        { departmentId: user.departmentId },
        { azubi: azubiScope(user) },
      ],
    };
  }
  return { azubi: azubiScope(user) };
}

export const canManageUsers = (role: Role) => role === "ADMIN";
export const canManageDepartments = (role: Role) => role === "ADMIN";
export const canReview = (role: Role) => role !== "AZUBI";
