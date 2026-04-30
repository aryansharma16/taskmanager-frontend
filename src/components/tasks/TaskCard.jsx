import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PriorityBadge from './PriorityBadge';
import DueDatePill from './DueDatePill';
import AssigneeAvatars from './AssigneeAvatars';
import { priorityTone } from './taskHelpers';

/**
 * Sortable, draggable task card. Designed to convey the most useful signals
 * at a glance:
 *   - Title (1-2 lines clamped)
 *   - Priority chip (color-coded)
 *   - Priority accent bar (left edge)
 *   - Due date pill (turns red when overdue)
 *   - Assignee avatar stack
 *   - Subtask progress bar (only when > 0)
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
  const subtaskPct = hasSubtasks
    ? Math.min(100, Math.round((completedSubs / subtaskCount) * 100))
    : 0;
  const allSubsDone = hasSubtasks && completedSubs === subtaskCount;

  const assignees = task.assignees || [];

  // Priority drives the left accent bar tone. Falls back to a neutral primary
  // tint when the task has no priority, so every card still has a hint of
  // structure on the left edge.
  const priorityName =
    typeof task.priority === 'object' ? task.priority?.name : task.priority;
  const tone = priorityName ? priorityTone(priorityName) : null;
  const accentBarClass = tone?.dot || 'bg-primary/40';

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
      className={`group relative overflow-hidden rounded-xl border bg-surface-container-lowest dark:bg-surface-container-low/80 border-outline-variant/40 dark:border-outline-variant/15 p-3 pl-4 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 dark:hover:border-primary/40 transition-all duration-200 ${
        isDragOverlay
          ? 'shadow-2xl ring-2 ring-primary/60 dark:ring-primary border-primary/60'
          : ''
      }`}
    >
      {/* Left priority accent bar */}
      <span
        aria-hidden
        className={`absolute left-0 top-0 bottom-0 w-1 ${accentBarClass} opacity-80 group-hover:opacity-100 transition-opacity`}
      />

      {/* Subtle hover sheen on the right edge */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
      />

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

      {/* Top row: priority chip + subtask indicator */}
      <div className="flex items-center gap-1.5 mb-2 pr-6 flex-wrap">
        {task.priority && <PriorityBadge priority={task.priority} size="xs" />}
        {task.parentTask && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary-container/15 text-primary-container dark:bg-primary/15 dark:text-primary border border-primary-container/30 dark:border-primary/30"
            title="Subtask"
          >
            <span className="material-symbols-outlined text-[12px]">
              subdirectory_arrow_right
            </span>
            Subtask
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="relative text-sm font-semibold text-on-surface leading-snug line-clamp-2 tracking-tight">
        {task.title || (
          <span className="italic text-outline">Untitled task</span>
        )}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="relative text-[11px] text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Subtask progress bar */}
      {hasSubtasks && (
        <div className="relative mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-on-surface-variant">
              <span className="material-symbols-outlined text-[12px]">
                {allSubsDone ? 'task_alt' : 'checklist'}
              </span>
              Subtasks
            </span>
            <span
              className={`text-[10px] font-bold tabular-nums ${
                allSubsDone
                  ? 'text-emerald-600 dark:text-emerald-300'
                  : 'text-on-surface-variant'
              }`}
              title={`${completedSubs} of ${subtaskCount} subtasks complete`}
            >
              {completedSubs}/{subtaskCount}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-surface-container-high dark:bg-surface-container-highest/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                allSubsDone
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-primary/70 to-primary'
              }`}
              style={{ width: `${Math.max(subtaskPct, 4)}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {task.dueDate && <DueDatePill iso={task.dueDate} size="xs" />}
        </div>
        <AssigneeAvatars users={assignees} size="xs" max={3} />
      </div>
    </div>
  );
};

export default TaskCard;
