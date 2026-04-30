import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

/**
 * A single Kanban column for one Status. Renders a droppable region with a
 * sortable context for vertical reordering. Includes:
 *   - Header: status name + count + color dot, with a top color accent bar
 *   - List of TaskCards (sortable)
 *   - Empty state ("Drop tasks here")
 *   - Inline "Add task" composer (collapsed by default)
 *
 * Optional column drag (left/right reorder of the whole pipeline) is
 * orchestrated by a parent (`SortableTaskColumn`) which passes
 * `dragHandleProps` — an object with `attributes` and `listeners` from
 * dnd-kit's `useSortable`. We deliberately attach those *only* to a small
 * grip button in the header (never to the body), so dragging a task card
 * inside the column never accidentally starts a column drag.
 */
const TaskColumn = ({
  status,
  tasks = [],
  onOpenTask,
  onQuickCreate,
  canCreate = true,
  dragHandleProps = null,
}) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');

  const droppableId = `column:${status._id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'column', statusId: status._id },
  });

  const itemIds = useMemo(() => tasks.map((t) => t._id), [tasks]);
  const accentColor = status.color || '#94a3b8';

  const handleSubmitDraft = (e) => {
    e?.preventDefault?.();
    const title = draftTitle.trim();
    if (!title) return;
    onQuickCreate?.({ title, statusId: status._id });
    setDraftTitle('');
    setComposerOpen(false);
  };

  return (
    <div className="flex flex-col w-72 sm:w-80 flex-shrink-0 max-h-full">
      {/* Column shell — wraps header + drop zone so they share a soft container
          treatment. Hover lifts the entire column subtly. */}
      <div
        className={`relative rounded-2xl border bg-surface-container-low/60 dark:bg-surface-container/30 backdrop-blur-sm border-outline-variant/30 dark:border-outline-variant/15 shadow-sm transition-all duration-200 ${
          isOver
            ? 'ring-2 ring-primary/50 dark:ring-primary/60 border-primary/40 shadow-lg'
            : 'hover:shadow-md'
        }`}
      >
        {/* Top color accent bar — uses the status color so the column reads
            as "this is the BACKLOG / IN PROGRESS / DONE swimlane" at a glance. */}
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{
            background: `linear-gradient(90deg, ${accentColor}cc 0%, ${accentColor}66 100%)`,
          }}
        />

        {/* Column header */}
        <div className="flex items-center justify-between gap-2 pt-3 pb-2.5 px-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {dragHandleProps && (
              <button
                type="button"
                {...(dragHandleProps.attributes || {})}
                {...(dragHandleProps.listeners || {})}
                // The card's onClick swallows propagation, so the column is
                // safe; this just stops dnd-kit's mousedown from bubbling
                // to the parent and triggering an unrelated handler.
                onMouseDown={(e) => e.stopPropagation()}
                className="p-0.5 rounded-md text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container dark:hover:bg-surface-container-highest/60 cursor-grab active:cursor-grabbing transition-colors flex-shrink-0"
                title="Drag to reorder column"
                aria-label="Reorder column"
              >
                <span className="material-symbols-outlined text-[16px]">
                  drag_indicator
                </span>
              </button>
            )}
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ring-2 ring-surface dark:ring-surface-container-low/80"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 0 1px ${accentColor}40, 0 0 12px ${accentColor}55`,
              }}
              aria-hidden
            />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-on-surface truncate">
              {status.name}
            </h3>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-on-surface-variant tabular-nums border border-outline-variant/30 dark:border-outline-variant/20"
              style={{
                backgroundColor: `${accentColor}1f`,
              }}
            >
              {tasks.length}
            </span>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => setComposerOpen((v) => !v)}
              className="p-1 rounded-md text-on-surface-variant hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors"
              title="Add task to this status"
              aria-label="Add task"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          ref={setNodeRef}
          className={`relative px-2 pb-2 pt-1 transition-colors ${
            isOver
              ? 'bg-primary/5 dark:bg-primary/10'
              : ''
          }`}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            <div
              className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5 min-h-[120px]"
              style={{ maxHeight: 'calc(100vh - 320px)' }}
            >
              {tasks.length === 0 && !composerOpen && (
                <div
                  className={`text-center py-8 px-3 rounded-xl border-2 border-dashed transition-colors ${
                    isOver
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-outline-variant/40 dark:border-outline-variant/20'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[32px] mb-1 block"
                    style={{ color: accentColor, opacity: 0.6 }}
                  >
                    inbox
                  </span>
                  <p className="text-[11px] text-on-surface-variant font-medium">
                    {isOver ? 'Drop here' : 'No tasks yet'}
                  </p>
                  {canCreate && !isOver && (
                    <button
                      type="button"
                      onClick={() => setComposerOpen(true)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        add_circle
                      </span>
                      Add the first task
                    </button>
                  )}
                </div>
              )}

              {tasks.map((task) => (
                <TaskCard key={task._id} task={task} onOpen={onOpenTask} />
              ))}

              {/* Inline composer */}
              {composerOpen && (
                <form
                  onSubmit={handleSubmitDraft}
                  className="rounded-xl border border-primary/40 bg-surface-container-lowest dark:bg-surface-container-low/90 p-2.5 shadow-md ring-2 ring-primary/15"
                >
                  <textarea
                    autoFocus
                    rows={2}
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitDraft();
                      } else if (e.key === 'Escape') {
                        setComposerOpen(false);
                        setDraftTitle('');
                      }
                    }}
                    placeholder="Task title…  (Enter to save, Esc to cancel)"
                    className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline resize-none focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-1 mt-1.5 pt-1.5 border-t border-outline-variant/30 dark:border-outline-variant/15">
                    <span className="text-[10px] text-on-surface-variant/70 hidden sm:inline">
                      <kbd className="px-1 py-0.5 rounded bg-surface-container dark:bg-surface-container-highest/60 text-[9px] font-mono">
                        Enter
                      </kbd>{' '}
                      to save
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setComposerOpen(false);
                          setDraftTitle('');
                        }}
                        className="text-[11px] px-2 py-1 rounded-md text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!draftTitle.trim()}
                        className="text-[11px] font-bold px-3 py-1 rounded-md bg-primary text-on-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 shadow-sm transition-colors"
                      >
                        Add task
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Footer add link when there are existing tasks */}
              {tasks.length > 0 && !composerOpen && canCreate && (
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="group flex items-center justify-center gap-1 mt-1 py-2 rounded-lg text-[11px] font-semibold text-on-surface-variant hover:text-primary border border-dashed border-outline-variant/40 dark:border-outline-variant/20 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px] transition-transform group-hover:rotate-90">
                    add
                  </span>
                  Add a task
                </button>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
};

export default TaskColumn;
