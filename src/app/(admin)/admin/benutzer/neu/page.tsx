import type { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { QueryToast } from "@/components/ui/toast";
import { ButtonLink } from "@/components/ui/button";
import { UserForm } from "@/components/admin/user-form";
import { createUser } from "@/actions/admin";

export default async function NeuerBenutzer({ searchParams }: { searchParams: Promise<{ error?: string; role?: string }> }) {
  const me = await requireRole("ADMIN", "AUSBILDER");
  const sp = await searchParams;
  const [departments, trainers] = await Promise.all([
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: { in: ["AUSBILDER", "ADMIN", "ABTEILUNGSLEITER"] }, active: true }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  return (
    <>
      <PageHeader title={me.role === "ADMIN" ? "Neuer Account" : "Neuen Azubi anlegen"} description="Azubis erhalten einen 8-stelligen Einladungscode und registrieren sich damit selbst." actions={<ButtonLink href={me.role === "ADMIN" ? "/admin/benutzer" : "/admin/azubis"} variant="ghost"><ArrowLeft className="h-4 w-4" /> Zurück</ButtonLink>} />
      <QueryToast error={sp.error} />
      <Card className="max-w-3xl"><CardBody><UserForm action={createUser} departments={departments} trainers={trainers} defaultRole={sp.role as Role | undefined} adminOnlyRoles={me.role === "ADMIN"} /></CardBody></Card>
    </>
  );
}
