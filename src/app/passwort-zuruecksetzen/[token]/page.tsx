import type { Metadata } from "next";
import { AuthLayout } from "@/components/shell/auth-layout";
import { ResetForm } from "./form";

export const metadata: Metadata = { title: "Neues Passwort" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthLayout title="Neues Passwort vergeben" subtitle="Der Link ist 60 Minuten gültig.">
      <ResetForm token={token} />
    </AuthLayout>
  );
}
