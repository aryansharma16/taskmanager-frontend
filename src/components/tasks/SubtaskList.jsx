import { useState } from 'react';
import StatusBadge from './StatusBadge';
import AssigneeAvatars from './AssigneeAvatars';
import DueDatePill from './DueDatePill';

/**
 * Lightweight sub-tasks list under a task. Each row is clickable to open in
 * the same detail panel. Includes an inline composer to add new subtasks.
 *
 * Props:
 *  - subtasks: array of task objects
 *  - loading: bool
 *  - onOpen(task): open a subtask in the panel
 *  - onCreate(title): create a subtask under the parent
 *  - canCreate: gate the composer behind a permission
 */
const SubtaskList = ({
  subtasks = [],
  loading = false,
  onOpen,
  onCreate,
  canCreate = true,
}) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const handleAdd = (e) => {
    e?.preventDefault?.();
    const t = draft.trim();
    if (!t) return;
    onCreate?.(t);
    setDraft('');
    setComposerOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">checklist</span>
          Subtasks
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container-low dark:bg-surface-container-highest/50">
            {subtasks.length}
          </span>
        </h4>
        {canCreate && !composerOpen && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add subtask
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center py-4 text-xs text-on-surface-variant">
          Loading subtasks…
        </div>
      )}

      {!loading && subtasks.length === 0 && !composerOpen && (
        <div className="text-center py-6 px-3 rounded-lg border border-dashed border-outline-variant/40 dark:border-outline-variant/20">
          <p className="text-[11px] text-on-surface-variant">
            Break this task down into smaller pieces.
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-2 text-[11px] font-semibold text-primary hover:underline"
            >
              + Add the first subtask
            </button>
          )}
        </div>
      )}

      {(subtasks.length > 0 || composerOpen) && (
        <ul className="space-y-1.5">
          {subtasks.map((s) => (
            <li
              key={s._id}
              className="group flex items-start gap-2 px-2.5 py-2 rounded-lg border border-outline-variant/30 dark:border-outline-variant/15 bg-surface-container-low/40 dark:bg-surface-container-highest/30 hover:bg-surface-container-low/80 dark:hover:bg-surface-container-highest/60 transition-colors cursor-pointer"
              onClick={() => onOpen?.(s)}
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant mt-0.5">
                subdirectory_arrow_right
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-on-surface truncate">
                  {s.title || <span className="italic text-outline">Untitled</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {s.status && <StatusBadge status={s.status} size="xs" />}
                  {s.dueDate && <DueDatePill iso={s.dueDate} size="xs" />}
                </div>
              </div>
              <AssigneeAvatars users={s.assignees || []} size="xs" max={2} />
            </li>
          ))}

          {composerOpen && (
            <li>
              <form
                onSubmit={handleAdd}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-primary/40 bg-surface dark:bg-surface-container-low/70"
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                  subdirectory_arrow_right
                </span>
                <input
                  type="text"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setComposerOpen(false);
                      setDraft('');
                    }
                  }}
                  placeholder="Subtask title…"
                  className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setComposerOpen(false);
                    setDraft('');
                  }}
                  className="text-[11px] px-2 py-1 rounded text-on-surface-variant hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded bg-primary text-on-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
                >
                  Add
                </button>
              </form>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SubtaskList;
