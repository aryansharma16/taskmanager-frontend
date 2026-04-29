import { priorityTone } from './taskHelpers';

/**
 * Compact priority chip. Accepts either a populated priority object
 * ({ _id, name, color? }) or just a name string. Returns null on empty.
 */
const PriorityBadge = ({ priority, size = 'md', showIcon = true, className = '' }) => {
  if (!priority) return null;
  const name = typeof priority === 'object' ? priority.name : priority;
  if (!name) return null;

  const tone = priorityTone(name);
  const sizing =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
      : size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${tone.chip} ${sizing} ${className}`}
      title={`Priority: ${name}`}
    >
      {showIcon && (
        <span
          className={`material-symbols-outlined ${
            size === 'xs' ? 'text-[12px]' : 'text-[14px]'
          }`}
          aria-hidden
        >
          {tone.icon}
        </span>
      )}
      <span>{name}</span>
    </span>
  );
};

export default PriorityBadge;
