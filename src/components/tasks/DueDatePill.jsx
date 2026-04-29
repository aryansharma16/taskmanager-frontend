import { formatDueDate } from './taskHelpers';

const TONE_CLASSES = {
  overdue:
    'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30',
  today:
    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
  upcoming:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  far:
    'bg-surface-container-low/60 dark:bg-surface-container-highest/40 text-on-surface-variant border-outline-variant/40 dark:border-outline-variant/20',
};

const TONE_ICONS = {
  overdue: 'event_busy',
  today: 'today',
  upcoming: 'event',
  far: 'event',
};

const DueDatePill = ({ iso, size = 'sm', className = '' }) => {
  const meta = formatDueDate(iso);
  if (!meta) return null;

  const sizing =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
      : size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${TONE_CLASSES[meta.tone]} ${sizing} ${className}`}
      title={new Date(meta.iso).toLocaleString()}
    >
      <span
        className={`material-symbols-outlined ${size === 'xs' ? 'text-[12px]' : 'text-[14px]'}`}
        aria-hidden
      >
        {TONE_ICONS[meta.tone]}
      </span>
      {meta.label}
    </span>
  );
};

export default DueDatePill;
