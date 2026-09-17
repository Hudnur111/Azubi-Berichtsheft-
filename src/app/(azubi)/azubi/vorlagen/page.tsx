import { requireAzubi } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { QueryToast } from "@/components/ui/toast";
import { TemplateManager } from "@/components/reports/template-manager";

export default async function VorlagenPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAzubi();
  const sp = await searchParams;
  const templates = await db.template.findMany({
    where: { OR: [{ ownerId: me.id }, { isGlobal: true }, ...(me.departmentId ? [{ departmentId: me.departmentId }] : [])] },
    orderBy: [{ isGlobal: "desc" }, { title: "asc" }],
    include: { department: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Textbausteine" description="Spare Zeit beim Schreiben deiner Berichte." />
      <QueryToast ok={sp.ok} error={sp.error} />
      <TemplateManager templates={templates} meId={me.id} isStaff={false} />
    </>
  );
}
