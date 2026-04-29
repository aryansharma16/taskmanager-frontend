import { getInitials, gradientFor } from './taskHelpers';

/**
 * Stacked avatar group for an array of user-like objects.
 * Accepts:
 *   - assignees: [{ _id, name, email, profilePic? }]
 *   - or assignments: [{ _id, user: {...}, role }]
 * (both accepted via the `users` prop, normalised inside)
 */
const AssigneeAvatars = ({ users = [], size = 'md', max = 3, className = '' }) => {
  const list = (users || [])
    .map((u) => (u?.user ? u.user : u))
    .filter((u) => u && (u._id || u.email || u.name));

  if (list.length === 0) return null;

  const dim =
    size === 'xs'
      ? 'w-5 h-5 text-[8px]'
      : size === 'sm'
      ? 'w-6 h-6 text-[9px]'
      : 'w-7 h-7 text-[10px]';
  const ringPx = size === 'xs' ? 'border' : 'border-2';

  const visible = list.slice(0, max);
  const overflow = list.length - visible.length;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visible.map((u) => (
        <div
          key={u._id || u.email}
          className={`${dim} ${ringPx} border-surface dark:border-surface-container-low rounded-full bg-gradient-to-br ${gradientFor(
            u._id || u.email || u.name
          )} flex items-center justify-center text-white font-bold`}
          title={u.name || u.email}
        >
          {getInitials(u.name || u.email)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`${dim} ${ringPx} border-surface dark:border-surface-container-low rounded-full bg-surface-container-highest dark:bg-surface-container-low flex items-center justify-center text-on-surface-variant font-bold`}
          title={`${overflow} more`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default AssigneeAvatars;
