import type { MemberInspectionStatus } from '../../types/member'

const STATUS_META: Record<MemberInspectionStatus, { label: string; className: string; dot: string }> = {
  unregistered: {
    label: '未登记',
    className: 'bg-stone-100 text-stone-600',
    dot: 'bg-stone-400',
  },
  qualified: {
    label: '合格',
    className: 'bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  repair: {
    label: '待修配',
    className: 'bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
  },
  stale: {
    label: '需复测',
    className: 'bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
}

interface InspectionBadgeProps {
  status: MemberInspectionStatus
  count?: number
  testId?: string
}

export function InspectionBadge({ status, count, testId }: InspectionBadgeProps) {
  const meta = STATUS_META[status]
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
      {typeof count === 'number' ? <strong>{count}</strong> : null}
    </span>
  )
}

export const INSPECTION_STATUS_ORDER: MemberInspectionStatus[] = ['qualified', 'repair', 'stale', 'unregistered']

export function inspectionStatusLabel(status: MemberInspectionStatus): string {
  return STATUS_META[status].label
}
