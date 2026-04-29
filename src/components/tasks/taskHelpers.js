// Small pure helpers shared by every task component. Keep them framework-free
// so they're trivial to unit-test and reuse.

export const hashString = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

export const getInitials = (name = '') => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase().slice(0, 2);
};

export const AVATAR_GRADIENTS = [
  'from-violet-500 to-fuchsia-600',
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-rose-500',
];

export const gradientFor = (seed = '') =>
  AVATAR_GRADIENTS[hashString(seed) % AVATAR_GRADIENTS.length];

// `task.status` and `task.priority` come back from the API either populated
// (object) or as a bare ObjectId. Normalise to id + name for components.
export const getStatusId = (task) => {
  if (!task?.status) return null;
  return typeof task.status === 'object' ? task.status._id : task.status;
};

export const getPriorityId = (task) => {
  if (!task?.priority) return null;
  return typeof task.priority === 'object' ? task.priority._id : task.priority;
};

export const getColumnStatusId = (column) => {
  if (!column?.status) return null;
  return typeof column.status === 'object' ? column.status._id : column.status;
};

// Format `dueDate` ISO string into something compact and human-friendly.
// Returns { label, tone } where `tone` is one of: 'overdue' | 'today' | 'upcoming' | 'far' | null
export const formatDueDate = (iso) => {
  if (!iso) return null;
  let d;
  try {
    d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
  } catch {
    return null;
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((dueMidnight - todayMidnight) / 86400000);

  let label;
  if (diffDays === 0) label = 'Today';
  else if (diffDays === 1) label = 'Tomorrow';
  else if (diffDays === -1) label = 'Yesterday';
  else if (diffDays > 1 && diffDays <= 6) label = d.toLocaleDateString(undefined, { weekday: 'short' });
  else label = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });

  let tone = 'upcoming';
  if (diffDays < 0) tone = 'overdue';
  else if (diffDays === 0) tone = 'today';
  else if (diffDays > 7) tone = 'far';

  return { label, tone, iso };
};

// Convert a Date / ISO string to an <input type="date"> value (yyyy-mm-dd in local tz).
export const toDateInputValue = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Map common priority names to a tailwind palette. Unknown names fall back
// to a neutral grey, so custom priorities still look reasonable.
export const PRIORITY_TONES = {
  URGENT: { dot: 'bg-rose-500', chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30', icon: 'priority_high' },
  HIGH: { dot: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/30', icon: 'arrow_upward' },
  MEDIUM: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30', icon: 'drag_handle' },
  NORMAL: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30', icon: 'drag_handle' },
  LOW: { dot: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30', icon: 'arrow_downward' },
  TRIVIAL: { dot: 'bg-slate-400', chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30', icon: 'remove' },
};

export const priorityTone = (name = '') => {
  if (!name) return null;
  const key = String(name).trim().toUpperCase();
  return PRIORITY_TONES[key] || {
    dot: 'bg-slate-400',
    chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
    icon: 'flag',
  };
};
