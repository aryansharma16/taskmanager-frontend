import { useMemo, useState } from 'react';
import StatusBadge from './StatusBadge';
import AssigneeAvatars from './AssigneeAvatars';
import DueDatePill from './DueDatePill';
import PriorityBadge from './PriorityBadge';

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

  // Roll-up progress: count subtasks whose status name reads as "done" /
  // "complete". Falls back to the explicit `isDone`/`completed` flags if the
  // backend ever surfaces them, so this stays useful even before statuses
  // are fully wired.
  const completedCount = useMemo(() => {
    return (subtasks || []).filter((s) => {
      if (s.isDone === true || s.completed === true) return true;
      const name = (
        typeof s.status === 'object' ? s.status?.name : ''
      )
        ?.toString()
        .trim()
        .toLowerCase();
      return (
        name === 'done' ||
        name === 'completed' ||
        name === 'complete' ||
        name === 'closed'
      );
    }).length;
  }, [subtasks]);

  const total = subtasks.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const handleAdd = (e) => {
    e?.preventDefault?.();
    const t = draft.trim();
    if (!t) return;
    onCreate?.(t);
    setDraft('');
    setComposerOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Header + progress summary */}
      <div className="rounded-xl border border-outline-variant/30 dark:border-outline-variant/15 bg-surface-container-lowest/40 dark:bg-surface-container/30 p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">
              checklist
            </span>
            Subtasks
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary tabular-nums">
              {total}
            </span>
          </h4>
          {canCreate && !composerOpen && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add subtask
            </button>
          )}
        </div>

        {total > 0 && (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-on-surface-variant">
                {completedCount} of {total} complete
              </span>
              <span
                className={`text-[10px] font-bold tabular-nums ${
                  pct === 100
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-on-surface-variant'
                }`}
              >
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-container-high dark:bg-surface-container-highest/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  pct === 100
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : 'bg-gradient-to-r from-primary/70 to-primary'
                }`}
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="text-center py-6">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
          <p className="text-[11px] text-on-surface-variant">
            Loading subtasks…
          </p>
        </div>
      )}

      {!loading && total === 0 && !composerOpen && (
        <div className="text-center py-10 px-3 rounded-xl border-2 border-dashed border-outline-variant/40 dark:border-outline-variant/20">
          <span className="material-symbols-outlined text-[36px] text-outline mb-2 block">
            account_tree
          </span>
          <p className="text-sm font-semibold text-on-surface mb-1">
            Break it down
          </p>
          <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto leading-relaxed">
            Split this task into smaller pieces of work so it's easier to track
            progress.
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-on-primary bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg shadow-sm shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[14px]">
                add_circle
              </span>
              Add the first subtask
            </button>
          )}
        </div>
      )}

      {(total > 0 || composerOpen) && (
        <ul className="space-y-2">
          {subtasks.map((s, idx) => {
            const statusName =
              typeof s.status === 'object' ? s.status?.name || '' : '';
            const isDone =
              s.isDone === true ||
              s.completed === true ||
              ['done', 'completed', 'complete', 'closed'].includes(
                statusName.trim().toLowerCase()
              );
            return (
              <li key={s._id}>
                <button
                  type="button"
                  onClick={() => onOpen?.(s)}
                  className="group w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border border-outline-variant/30 dark:border-outline-variant/15 bg-surface-container-lowest/60 dark:bg-surface-container/40 hover:bg-surface-container-low/80 dark:hover:bg-surface-container-highest/40 hover:border-primary/40 hover:shadow-sm transition-all text-left"
                >
                  {/* Index / done marker */}
                  <span
                    className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold tabular-nums flex-shrink-0 transition-colors ${
                      isDone
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-surface-container-low dark:bg-surface-container-highest/60 text-on-surface-variant border border-outline-variant/30'
                    }`}
                    aria-hidden
                  >
                    {isDone ? (
                      <span className="material-symbols-outlined text-[14px]">
                        check
                      </span>
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold truncate transition-colors ${
                        isDone
                          ? 'text-on-surface-variant line-through'
                          : 'text-on-surface group-hover:text-primary'
                      }`}
                    >
                      {s.title || (
                        <span className="italic text-outline">Untitled</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {s.status && <StatusBadge status={s.status} size="xs" />}
                      {s.priority && (
                        <PriorityBadge priority={s.priority} size="xs" />
                      )}
                      {s.dueDate && <DueDatePill iso={s.dueDate} size="xs" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <AssigneeAvatars
                      users={s.assignees || []}
                      size="xs"
                      max={2}
                    />
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                      chevron_right
                    </span>
                  </div>
                </button>
              </li>
            );
          })}

          {composerOpen && (
            <li>
              <form
                onSubmit={handleAdd}
                className="rounded-xl border border-primary/40 bg-surface-container-lowest dark:bg-surface-container-low/90 p-2.5 shadow-md ring-2 ring-primary/15"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">
                    add_task
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
                    placeholder="What needs to be done…"
                    className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-outline-variant/30 dark:border-outline-variant/15">
                  <span className="text-[10px] text-on-surface-variant/70 hidden sm:inline">
                    <kbd className="px-1 py-0.5 rounded bg-surface-container dark:bg-surface-container-highest/60 text-[9px] font-mono">
                      Esc
                    </kbd>{' '}
                    to cancel
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setComposerOpen(false);
                        setDraft('');
                      }}
                      className="text-[11px] px-2 py-1 rounded-md text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="text-[11px] font-bold px-3 py-1 rounded-md bg-primary text-on-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 shadow-sm transition-colors"
                    >
                      Add subtask
                    </button>
                  </div>
                </div>
              </form>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SubtaskList;
