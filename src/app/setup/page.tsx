import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AuthLayout } from "@/components/shell/auth-layout";
import { SetupForm } from "./form";

export const metadata: Metadata = { title: "Ersteinrichtung" };

export default async function SetupPage() {
  if (await db.user.count({ where: { role: "ADMIN" } })) redirect("/login");
  return (
    <AuthLayout
      title="Ersteinrichtung"
      subtitle="Lege den ersten Administrator-Account an. Danach kannst du Abteilungen, Ausbilder/innen und Azubis anlegen."
      aside={<div className="space-y-4"><h1 className="text-3xl font-semibold leading-tight">Willkommen!</h1><p className="text-brand-100">Diese Seite erscheint nur, solange noch kein Administrator existiert. Sie ist danach automatisch deaktiviert.</p></div>}
    >
      <SetupForm />
    </AuthLayout>
  );
}
