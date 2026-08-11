const POSITIVE = new Set(['RECEIVED', 'CONFIRMED', 'COMPLETED', 'PAID']);
const NEGATIVE = new Set(['CANCELLED']);
const NEUTRAL_WARN = new Set(['DRAFT', 'PLANNED', 'OPEN']);

export default function StatusBadge({ status }: { status: string }) {
  let variant = '';
  if (POSITIVE.has(status)) variant = 'badge--success';
  else if (NEGATIVE.has(status)) variant = 'badge--danger';
  else if (NEUTRAL_WARN.has(status)) variant = 'badge--warning';

  return <span className={`badge ${variant}`}>{status}</span>;
}
