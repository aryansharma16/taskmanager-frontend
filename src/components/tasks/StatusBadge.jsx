/**
 * Status chip. Backend statuses can carry a `color` (hex) — we use it for the
 * dot. The chip uses subtle theme tokens so it works in both light and dark.
 *
 * Accepts a populated status ({ _id, name, color? }) or a name string.
 */
const StatusBadge = ({ status, size = 'md', className = '' }) => {
  if (!status) return null;
  const obj = typeof status === 'object' ? status : { name: status };
  if (!obj.name) return null;

  const sizing =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-1'
      : size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5';

  const dotSize = size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const dotColor = obj.color || '#94a3b8';

  return (
    <span
      className={`inline-flex items-center rounded-full border border-outline-variant/40 dark:border-outline-variant/20 bg-surface-container-low/60 dark:bg-surface-container-highest/40 text-on-surface-variant font-semibold uppercase tracking-wide ${sizing} ${className}`}
      title={`Status: ${obj.name}`}
    >
      <span
        className={`${dotSize} rounded-full flex-shrink-0`}
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="truncate">{obj.name}</span>
    </span>
  );
};

export default StatusBadge;
