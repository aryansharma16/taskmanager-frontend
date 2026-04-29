import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskColumn from './TaskColumn';

/**
 * Wraps a `TaskColumn` so it's sortable in the *horizontal* axis (left/right
 * pipeline reorder). Two important details:
 *
 *  1. The dnd-kit listeners are passed down to TaskColumn as
 *     `dragHandleProps` and only attached to the column's small grip
 *     button. The wrapper div carries `setNodeRef` + the transform style
 *     but NO listeners, so dragging anywhere else inside the column body
 *     (a card, a composer, the drop zone) never starts a column drag.
 *
 *  2. The "no status" bucket — which the board surfaces when tasks have
 *     `status: null` — is not a real Status row, so we skip the sortable
 *     wiring entirely (`disabled`); the FE doesn't reorder it server-side.
 *
 * The id is namespaced (`col:<statusId>`) so it can't collide with task ids
 * inside the same DnDContext.
 */
const SortableTaskColumn = ({ status, draggable = true, ...rest }) => {
  // A column without a real ObjectId (e.g. the "no status" bucket) is not
  // reorderable — guard against that here so the parent doesn't have to.
  const isReorderable = draggable && Boolean(status?._id);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `col:${status?._id ?? 'no-status'}`,
    data: { type: 'column-handle', statusId: status?._id ?? null },
    disabled: !isReorderable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Fade the source while it's actively in flight; the layout shift is
    // handled by dnd-kit via `transform`.
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-shrink-0">
      <TaskColumn
        status={status}
        {...rest}
        dragHandleProps={
          isReorderable ? { attributes, listeners } : null
        }
      />
    </div>
  );
};

export default SortableTaskColumn;
