const POSITIVE = new Set(['RECEIVED', 'CONFIRMED', 'COMPLETED', 'PAID', 'DELIVERED']);
const NEGATIVE = new Set(['CANCELLED']);
const NEUTRAL_WARN = new Set(['DRAFT', 'PLANNED', 'OPEN', 'PENDING']);
const SPECIAL = new Set(['SHIPPED']);

export default function StatusBadge({ status }: { status: string }) {
  let variant = '';
  if (POSITIVE.has(status)) variant = 'badge--success';
  else if (NEGATIVE.has(status)) variant = 'badge--danger';
  else if (NEUTRAL_WARN.has(status)) variant = 'badge--warning';
  else if (SPECIAL.has(status)) variant = 'badge--special';

  return <span className={`badge ${variant}`}>{status}</span>;
}
