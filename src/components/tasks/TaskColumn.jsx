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
 *   - Header: status name + count + color dot
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
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          {dragHandleProps && (
            <button
              type="button"
              {...(dragHandleProps.attributes || {})}
              {...(dragHandleProps.listeners || {})}
              // The card's onClick swallows propagation, so the column is
              // safe; this just stops dnd-kit's mousedown from bubbling
              // to the parent and triggering an unrelated handler.
              onMouseDown={(e) => e.stopPropagation()}
              className="p-0.5 rounded-md text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 cursor-grab active:cursor-grabbing transition-colors flex-shrink-0"
              title="Drag to reorder column"
              aria-label="Reorder column"
            >
              <span className="material-symbols-outlined text-[16px]">
                drag_indicator
              </span>
            </button>
          )}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: status.color || '#94a3b8' }}
            aria-hidden
          />
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface truncate">
            {status.name}
          </h3>
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-container-low dark:bg-surface-container-highest/50 text-on-surface-variant">
            {tasks.length}
          </span>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setComposerOpen((v) => !v)}
            className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 transition-colors"
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
        className={`flex-1 min-h-[120px] rounded-xl p-2 transition-colors ${
          isOver
            ? 'bg-primary-container/15 dark:bg-primary/10 ring-2 ring-primary-container/50 dark:ring-primary/40'
            : 'bg-surface-container-low/50 dark:bg-surface-container/40'
        }`}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            {tasks.length === 0 && !composerOpen && (
              <div className="text-center py-8 px-2">
                <span className="material-symbols-outlined text-[28px] text-outline mb-1 block">
                  inbox
                </span>
                <p className="text-[11px] text-on-surface-variant">No tasks yet</p>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => setComposerOpen(true)}
                    className="mt-2 text-[11px] font-semibold text-primary hover:underline"
                  >
                    + Add the first task
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
                className="rounded-lg border border-dashed border-primary/40 bg-surface dark:bg-surface-container-low/70 p-2 shadow-sm"
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
                <div className="flex items-center justify-end gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerOpen(false);
                      setDraftTitle('');
                    }}
                    className="text-[11px] px-2 py-1 rounded text-on-surface-variant hover:bg-surface-container-low"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!draftTitle.trim()}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded bg-primary text-on-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Footer add link when there are existing tasks */}
            {tasks.length > 0 && !composerOpen && canCreate && (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="flex items-center justify-center gap-1 mt-1 py-1.5 rounded-lg text-[11px] font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low/80 dark:hover:bg-surface-container-highest/60 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Add a task
              </button>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export default TaskColumn;
