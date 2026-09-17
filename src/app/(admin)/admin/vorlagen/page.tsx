import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { QueryToast } from "@/components/ui/toast";
import { TemplateManager } from "@/components/reports/template-manager";

export default async function AdminVorlagen({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const [templates, departments] = await Promise.all([
    db.template.findMany({ where: me.role === "ADMIN" ? {} : { OR: [{ ownerId: me.id }, { isGlobal: true }, { departmentId: me.departmentId ?? "__none__" }] }, orderBy: [{ isGlobal: "desc" }, { title: "asc" }], include: { department: { select: { name: true } } } }),
    db.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="Textbausteine" description="Globale oder abteilungsspezifische Vorlagen für Azubis bereitstellen." />
      <QueryToast ok={sp.ok} error={sp.error} />
      <TemplateManager templates={templates} meId={me.id} isStaff departments={departments} />
    </>
  );
}
