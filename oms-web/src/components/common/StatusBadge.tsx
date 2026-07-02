import type { OrderStatus } from '../../types/api'

const MAP: Record<string, string> = {
  PENDING:   'bg-amber/20 text-amber',
  OPEN:      'bg-accent-blue/20 text-accent-blue',
  PARTIAL:   'bg-accent-blue/20 text-accent-blue',
  FILLED:    'bg-bull/20 text-bull',
  CANCELLED: 'bg-muted/20 text-muted',
  REJECTED:  'bg-bear/20 text-bear',
  EXPIRED:   'bg-muted/20 text-muted',
  ACTIVE:    'bg-bull/20 text-bull',
  COMPLETED: 'bg-bull/20 text-bull',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${MAP[status] ?? 'bg-muted/20 text-muted'}`}>
      {status}
    </span>
  )
}
