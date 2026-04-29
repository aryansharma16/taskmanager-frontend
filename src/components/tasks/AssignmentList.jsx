import { useMemo, useState } from 'react';
import { getInitials, gradientFor } from './taskHelpers';

const ROLE_OPTIONS = [
  { value: 'LEADER', label: 'Leader', icon: 'flag', tone: 'text-rose-600 dark:text-rose-300' },
  { value: 'ASSIGNEE', label: 'Assignee', icon: 'assignment_ind', tone: 'text-primary dark:text-primary' },
  { value: 'WATCHER', label: 'Watcher', icon: 'visibility', tone: 'text-on-surface-variant' },
];

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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">group</span>
          Assignees
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container-low dark:bg-surface-container-highest/50">
            {assignments.length}
          </span>
        </h4>
        {canManage && !pickerOpen && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">person_add</span>
            Add assignee
          </button>
        )}
      </div>

      {/* Add picker */}
      {pickerOpen && canManage && (
        <div className="mb-3 rounded-lg border border-dashed border-primary/40 bg-surface dark:bg-surface-container-low/70 p-2">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workspace members…"
              className="flex-1 px-2.5 py-1.5 rounded-md border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
              className="px-2 py-1.5 rounded-md border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setPickerOpen(false);
                setSearch('');
              }}
              className="text-[11px] px-2 py-1.5 rounded text-on-surface-variant hover:bg-surface-container-low"
            >
              Done
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto custom-scrollbar">
            {availableCandidates.length === 0 ? (
              <p className="text-center text-[11px] text-on-surface-variant py-4">
                {candidates.length === 0
                  ? 'No workspace members to choose from.'
                  : 'Everyone here is already assigned.'}
              </p>
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
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-container-low/80 dark:hover:bg-surface-container-highest/40 transition-colors text-left"
                    >
                      <div
                        className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradientFor(u._id || u.email)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                      >
                        {getInitials(u.name || u.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-on-surface truncate">
                          {u.name || u.email}
                        </div>
                        <div className="text-[10px] text-on-surface-variant truncate">
                          {u.email}
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        add
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
        <div className="text-center py-4 px-3 rounded-lg border border-dashed border-outline-variant/40 dark:border-outline-variant/20">
          <p className="text-[11px] text-on-surface-variant">No one assigned yet.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {assignments.map((a) => {
            const u = a.user || {};
            const userId = u._id;
            return (
              <li
                key={a._id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-outline-variant/30 dark:border-outline-variant/15 bg-surface-container-low/40 dark:bg-surface-container-highest/30"
              >
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradientFor(userId || u.email)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
                >
                  {getInitials(u.name || u.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-on-surface truncate">
                    {u.name || u.email || 'Unknown user'}
                  </div>
                  <div className="text-[10px] text-on-surface-variant truncate">
                    {u.email}
                  </div>
                </div>
                {canManage ? (
                  <select
                    value={a.role || 'ASSIGNEE'}
                    onChange={(e) => onChangeRole?.(a._id, e.target.value)}
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-1 rounded border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-1 rounded bg-surface-container-low dark:bg-surface-container-highest/50 text-on-surface-variant">
                    {a.role || 'ASSIGNEE'}
                  </span>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onRemove?.(a._id)}
                    className="p-1 rounded text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10"
                    title="Remove"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
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
