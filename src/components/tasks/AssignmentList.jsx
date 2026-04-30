import { useMemo, useState } from 'react';
import { getInitials, gradientFor } from './taskHelpers';

const ROLE_OPTIONS = [
  {
    value: 'LEADER',
    label: 'Leader',
    icon: 'flag',
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30',
    ring: 'ring-rose-500/40',
  },
  {
    value: 'ASSIGNEE',
    label: 'Assignee',
    icon: 'assignment_ind',
    chip: 'bg-primary/10 text-primary border-primary/30',
    ring: 'ring-primary/40',
  },
  {
    value: 'WATCHER',
    label: 'Watcher',
    icon: 'visibility',
    chip: 'bg-surface-container-high dark:bg-surface-container-highest/50 text-on-surface-variant border-outline-variant/40',
    ring: 'ring-outline-variant/40',
  },
];

const roleMeta = (role) =>
  ROLE_OPTIONS.find((r) => r.value === role) || ROLE_OPTIONS[1];

/**
 * Manage who's assigned to a task. Shows current assignees, lets the user
 * add a new one (filtered to workspace members not already assigned), change
 * roles, or remove.
 *
 * Props:
 *   - assignments: [{ _id, user, role }]
 *   - candidates: workspace member rows from /workspaces/:id/members
 *                 (each has { _id, user, role })
 *   - onAdd({ userId, role })
 *   - onChangeRole(assignmentId, role)
 *   - onRemove(assignmentId)
 *   - canManage: gates add/remove/role-change UI
 */
const AssignmentList = ({
  assignments = [],
  candidates = [],
  onAdd,
  onChangeRole,
  onRemove,
  canManage = true,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draftRole, setDraftRole] = useState('ASSIGNEE');

  const assignedUserIds = useMemo(
    () => new Set(assignments.map((a) => a.user?._id || a.user).filter(Boolean)),
    [assignments]
  );

  const availableCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (candidates || [])
      .map((c) => (c.user ? c.user : c))
      .filter((u) => u && u._id && !assignedUserIds.has(u._id))
      .filter((u) => {
        if (!q) return true;
        return (
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      });
  }, [candidates, assignedUserIds, search]);

  // Group assignments by role so the panel reads as Leaders → Assignees →
  // Watchers, which roughly mirrors how teams think about ownership.
  const grouped = useMemo(() => {
    const groups = { LEADER: [], ASSIGNEE: [], WATCHER: [] };
    assignments.forEach((a) => {
      const role = a.role || 'ASSIGNEE';
      if (!groups[role]) groups[role] = [];
      groups[role].push(a);
    });
    return groups;
  }, [assignments]);

  const draftRoleMeta = roleMeta(draftRole);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border border-outline-variant/30 dark:border-outline-variant/15 bg-surface-container-lowest/40 dark:bg-surface-container/30 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">
              group
            </span>
            Team
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary tabular-nums">
              {assignments.length}
            </span>
          </h4>
          {canManage && !pickerOpen && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">
                person_add
              </span>
              Add member
            </button>
          )}
        </div>

        {/* Role distribution summary */}
        {assignments.length > 0 && (
          <div className="flex items-center gap-3 mt-2.5 text-[10px] font-semibold text-on-surface-variant">
            {ROLE_OPTIONS.map((r) => (
              <span
                key={r.value}
                className="inline-flex items-center gap-1"
                title={`${grouped[r.value]?.length || 0} ${r.label.toLowerCase()}(s)`}
              >
                <span
                  className={`material-symbols-outlined text-[12px] ${
                    r.value === 'LEADER'
                      ? 'text-rose-500'
                      : r.value === 'ASSIGNEE'
                      ? 'text-primary'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {r.icon}
                </span>
                {grouped[r.value]?.length || 0}
                <span className="hidden sm:inline">{r.label.toLowerCase()}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add picker */}
      {pickerOpen && canManage && (
        <div className="rounded-xl border border-primary/40 bg-surface-container-lowest dark:bg-surface-container-low/90 p-3 shadow-md ring-2 ring-primary/15 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-primary">
                person_add
              </span>
              Invite to this task
            </p>
            <button
              type="button"
              onClick={() => {
                setPickerOpen(false);
                setSearch('');
              }}
              className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 transition-colors"
              aria-label="Close picker"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members…"
                className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low/70 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                search
              </span>
            </div>
          </div>

          {/* Role chooser as pills (clearer than a select) */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant pr-1">
              Add as:
            </span>
            {ROLE_OPTIONS.map((r) => {
              const isActive = draftRole === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setDraftRole(r.value)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    isActive
                      ? `${r.chip} ring-1 ${r.ring}`
                      : 'bg-transparent text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {r.icon}
                  </span>
                  {r.label}
                </button>
              );
            })}
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar -mx-1 px-1">
            {availableCandidates.length === 0 ? (
              <div className="text-center py-6 px-3">
                <span className="material-symbols-outlined text-[28px] text-outline mb-1 block">
                  person_off
                </span>
                <p className="text-[11px] text-on-surface-variant">
                  {candidates.length === 0
                    ? 'No workspace members to choose from.'
                    : search
                    ? 'No members match your search.'
                    : 'Everyone here is already assigned.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {availableCandidates.map((u) => (
                  <li key={u._id}>
                    <button
                      type="button"
                      onClick={() => {
                        onAdd?.({ userId: u._id, role: draftRole });
                        setSearch('');
                      }}
                      className="group w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-primary/8 dark:hover:bg-primary/15 transition-colors text-left border border-transparent hover:border-primary/30"
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradientFor(
                          u._id || u.email
                        )} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm`}
                      >
                        {getInitials(u.name || u.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-on-surface truncate">
                          {u.name || u.email}
                        </div>
                        {u.email && u.name && (
                          <div className="text-[10px] text-on-surface-variant truncate">
                            {u.email}
                          </div>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${draftRoleMeta.chip} opacity-0 group-hover:opacity-100 transition-opacity`}
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          add
                        </span>
                        {draftRoleMeta.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Current assignees */}
      {assignments.length === 0 ? (
        <div className="text-center py-10 px-3 rounded-xl border-2 border-dashed border-outline-variant/40 dark:border-outline-variant/20">
          <span className="material-symbols-outlined text-[36px] text-outline mb-2 block">
            group_add
          </span>
          <p className="text-sm font-semibold text-on-surface mb-1">
            No one assigned yet
          </p>
          <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto leading-relaxed">
            Add a leader, assignees, or watchers from your workspace.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-on-primary bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg shadow-sm shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[14px]">
                person_add
              </span>
              Assign your first member
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => {
            const u = a.user || {};
            const userId = u._id;
            const meta = roleMeta(a.role);
            return (
              <li
                key={a._id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-outline-variant/30 dark:border-outline-variant/15 bg-surface-container-lowest/60 dark:bg-surface-container/40 hover:bg-surface-container-low/80 dark:hover:bg-surface-container-highest/40 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientFor(
                      userId || u.email
                    )} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                  >
                    {getInitials(u.name || u.email)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-surface dark:border-surface-container-low ${
                      a.role === 'LEADER'
                        ? 'bg-rose-500 text-white'
                        : a.role === 'WATCHER'
                        ? 'bg-surface-container-high text-on-surface-variant'
                        : 'bg-primary text-on-primary'
                    }`}
                    title={meta.label}
                    aria-hidden
                  >
                    <span className="material-symbols-outlined text-[10px]">
                      {meta.icon}
                    </span>
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-on-surface truncate">
                    {u.name || u.email || 'Unknown user'}
                  </div>
                  {u.email && u.name && (
                    <div className="text-[11px] text-on-surface-variant truncate">
                      {u.email}
                    </div>
                  )}
                </div>

                {canManage ? (
                  <div className="relative">
                    <select
                      value={a.role || 'ASSIGNEE'}
                      onChange={(e) => onChangeRole?.(a._id, e.target.value)}
                      className={`appearance-none cursor-pointer text-[10px] font-bold uppercase tracking-wider pl-2.5 pr-6 py-1 rounded-full border ${meta.chip} focus:outline-none focus:ring-2 focus:ring-primary/40`}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option
                          key={r.value}
                          value={r.value}
                          className="bg-surface text-on-surface"
                        >
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[12px] opacity-70">
                      expand_more
                    </span>
                  </div>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${meta.chip}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {meta.icon}
                    </span>
                    {meta.label}
                  </span>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={() => onRemove?.(a._id)}
                    className="p-1.5 rounded-md text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove from task"
                    aria-label="Remove"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      person_remove
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AssignmentList;
