import { Badge } from '@/components/ui/badge'
import { statusLabels } from '@/lib/format'
import type { StatusPedido } from '@/types/types'

export function StatusBadge({ status }: { status: StatusPedido }) {
  return (
    <Badge className="status-badge" data-status={status}>
      {statusLabels[status]}
    </Badge>
  )
}
