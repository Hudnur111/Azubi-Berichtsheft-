import type { ReportStatus } from "@prisma/client";
import { Badge } from "./badge";
import { STATUS_LABELS, STATUS_TONE } from "@/lib/labels";

export function StatusBadge({ status }: { status: ReportStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}
