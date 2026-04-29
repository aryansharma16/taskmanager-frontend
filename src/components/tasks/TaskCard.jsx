import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PriorityBadge from './PriorityBadge';
import DueDatePill from './DueDatePill';
import AssigneeAvatars from './AssigneeAvatars';

/**
 * Sortable, draggable task card. Designed to convey the most useful signals
 * at a glance:
 *   - Title (1-2 lines clamped)
 *   - Priority chip (color-coded)
 *   - Due date pill (turns red when overdue)
 *   - Assignee avatar stack
 *   - Subtask count (only when > 0)
 *   - A subtle "drag handle" affordance on hover
 */
const TaskCard = ({ task, onOpen, isDragOverlay = false }) => {
  const id = task._id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: 'task', task },
    disabled: isDragOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the original while the overlay is being dragged for cleaner visuals
    opacity: isDragging ? 0 : 1,
  };

  const subtaskCount = task.subtaskCount ?? task.subtasks?.length ?? 0;
  const hasSubtasks = subtaskCount > 0;
  const completedSubs = task.completedSubtaskCount ?? 0;

  const assignees = task.assignees || [];

  const handleClick = (e) => {
    // Don't open the panel if the user just finished a drag.
    if (isDragOverlay) return;
    e.preventDefault();
    onOpen?.(task);
  };

  // Stop the click that the drag handle generates from also triggering open.
  const handleHandleMouseDown = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(task);
        }
      }}
      className={`group relative rounded-lg border bg-surface dark:bg-surface-container-low/70 border-outline-variant/40 dark:border-outline-variant/20 p-3 cursor-pointer hover:shadow-md hover:border-primary-container/60 dark:hover:border-primary/40 transition-all ${
        isDragOverlay ? 'shadow-2xl ring-2 ring-primary-container dark:ring-primary' : ''
      }`}
    >
      {/* Drag handle — visible on hover, accessible via keyboard via the parent */}
      <button
        type="button"
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleHandleMouseDown}
        className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-surface-container-low dark:hover:bg-surface-container-highest text-on-surface-variant cursor-grab active:cursor-grabbing transition-opacity"
        title="Drag to reorder"
        aria-label="Drag task"
      >
        <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
      </button>

      {/* Top row: priority chip */}
      <div className="flex items-center gap-1.5 mb-1.5 pr-6">
        {task.priority && <PriorityBadge priority={task.priority} size="xs" />}
        {task.parentTask && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary-container/15 text-primary-container dark:bg-primary/15 dark:text-primary border border-primary-container/30 dark:border-primary/30"
            title="Subtask"
          >
            <span className="material-symbols-outlined text-[12px]">subdirectory_arrow_right</span>
            Subtask
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-on-surface leading-snug line-clamp-2">
        {task.title || <span className="italic text-outline">Untitled task</span>}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Meta row */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {task.dueDate && <DueDatePill iso={task.dueDate} size="xs" />}
          {hasSubtasks && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-low/80 dark:bg-surface-container-highest/40"
              title={`${completedSubs} of ${subtaskCount} subtasks complete`}
            >
              <span className="material-symbols-outlined text-[12px]">checklist</span>
              {completedSubs}/{subtaskCount}
            </span>
          )}
        </div>
        <AssigneeAvatars users={assignees} size="xs" max={3} />
      </div>
    </div>
  );
};

export default TaskCard;
