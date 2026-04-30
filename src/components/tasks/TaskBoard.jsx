import { useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import SortableTaskColumn from './SortableTaskColumn';
import TaskCard from './TaskCard';
import { getColumnStatusId } from './taskHelpers';

/**
 * Pure Kanban board. The component is intentionally "dumb" with respect to
 * the network: callers pass `columns` and two callbacks. The board:
 *   - Renders a horizontally-scrolling row of TaskColumns.
 *   - Routes a single dnd-kit DnDContext to either a *card* drag (vertical /
 *     across columns) or a *column* drag (horizontal pipeline reorder),
 *     based on the dragged item's data.type.
 *   - Computes beforeId/afterId from the drop target for card moves.
 *   - Uses an optional `onOptimisticMove` so the parent can reflect a card
 *     move in the UI before the network round-trip resolves.
 *
 * Callbacks:
 *   onMove({ taskId, statusId, fromStatusId, position })
 *     — fired after a *card* drag. `position` is the 0-based slot in the
 *       TARGET column the card should occupy AFTER the move (the dragged
 *       card itself is excluded from the count). This is API spec §5.10
 *       Style A.1; the parent forwards it as-is to /tasks/:id/move.
 *   onColumnReorder(orderedStatusIds)
 *     — fired after a *column* drag, with the full new pipeline order.
 *       Excludes the synthetic "no status" bucket if present.
 */
const TaskBoard = ({
  columns = [],
  onOpenTask,
  onMove,
  onOptimisticMove,
  onColumnReorder,
  onQuickCreate,
  canCreate = true,
  canReorderColumns = true,
}) => {
  const [activeTask, setActiveTask] = useState(null);
  const [activeColumnStatus, setActiveColumnStatus] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Two SortableContexts (columns + tasks) live inside the same DnDContext,
  // so a global `closestCorners` will happily pick a task card as the "over"
  // target while the user is dragging a column header — and our column-drag
  // handler then bails out because over.id doesn't start with `col:`. Scope
  // the detection by drag type: column drags only collide with column slots,
  // task drags consider every droppable as before.
  const collisionDetection = useCallback((args) => {
    const isColumnDrag =
      args.active?.data?.current?.type === 'column-handle';
    if (!isColumnDrag) return closestCorners(args);

    const columnContainers = args.droppableContainers.filter((c) => {
      const id = c.id;
      return typeof id === 'string' && id.startsWith('col:');
    });
    return closestCorners({ ...args, droppableContainers: columnContainers });
  }, []);

  // Build a quick lookup: taskId -> { columnIdx, taskIdx, statusId }
  const taskIndex = useMemo(() => {
    const idx = new Map();
    columns.forEach((col, columnIdx) => {
      const statusId = getColumnStatusId(col);
      (col.tasks || []).forEach((t, taskIdx) => {
        idx.set(t._id, { columnIdx, taskIdx, statusId, task: t });
      });
    });
    return idx;
  }, [columns]);

  // Sortable ids for the column row. Skip the synthetic "no status" bucket —
  // it has a null statusId on the server and isn't part of the pipeline.
  const columnIds = useMemo(
    () =>
      columns
        .filter((c) => Boolean(getColumnStatusId(c)))
        .map((c) => `col:${getColumnStatusId(c)}`),
    [columns]
  );

  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      // The active item self-identifies via its dnd-kit `data.type`.
      // (Set by SortableTaskColumn for columns and by TaskCard for tasks.)
      const type = active.data.current?.type;
      if (type === 'column-handle') {
        setActiveColumnStatus(active.data.current?.statusId || null);
        setActiveTask(null);
        return;
      }
      const meta = taskIndex.get(active.id);
      if (meta) {
        setActiveTask(meta.task);
        setActiveColumnStatus(null);
      }
    },
    [taskIndex]
  );

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    setActiveColumnStatus(null);
  }, []);

  const handleColumnDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // We only know how to drop a column on another column slot. Other
      // overs (a card, the no-status bucket) are ignored to keep the
      // pipeline order well-defined.
      const overId = typeof over.id === 'string' ? over.id : '';
      const activeId = typeof active.id === 'string' ? active.id : '';
      if (!overId.startsWith('col:') || !activeId.startsWith('col:')) return;

      const fromIdx = columnIds.indexOf(activeId);
      const toIdx = columnIds.indexOf(overId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      const next = arrayMove(columnIds, fromIdx, toIdx).map((cid) =>
        cid.replace(/^col:/, '')
      );
      onColumnReorder?.(next);
    },
    [columnIds, onColumnReorder]
  );

  const handleTaskDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromMeta = taskIndex.get(active.id);
      if (!fromMeta) return;

      let targetStatusId;
      let targetColumn;
      // `position` is the 0-based slot the dragged card should occupy in the
      // target column **after** the move (the dragged card itself is excluded
      // from the count). This matches §5.10 A.1 of the API spec; we send it
      // directly to /tasks/:id/move and let the backend compute `order`.
      let position;

      if (
        over.data.current?.type === 'column' ||
        over.data.current?.type === 'column-handle'
      ) {
        // Drop on the column itself (empty drop zone or grip handle) → append
        // to the END of the target column. The "end" is the post-removal
        // length, so a same-column "drop on column" doesn't try to insert at
        // a slot index past the end of the filtered list.
        targetStatusId = over.data.current.statusId;
        targetColumn = columns.find(
          (c) => getColumnStatusId(c) === targetStatusId
        );
        const destLen = (targetColumn?.tasks || []).filter(
          (t) => t._id !== active.id
        ).length;
        position = destLen;
      } else {
        // Drop on a card → insert ABOVE that card.
        const overMeta = taskIndex.get(over.id);
        if (!overMeta) return;
        targetStatusId = overMeta.statusId;
        targetColumn = columns[overMeta.columnIdx];

        // Same-column DOWNWARD drag: removing the dragged task shifts the
        // over card up by one slot, so the slot directly above the over
        // card's *post-removal* position is overMeta.taskIdx - 1. For
        // upward drags or cross-column drops, no shift happens.
        const sameColumn = fromMeta.statusId === overMeta.statusId;
        position =
          sameColumn && fromMeta.taskIdx < overMeta.taskIdx
            ? overMeta.taskIdx - 1
            : overMeta.taskIdx;
      }

      if (!targetColumn) return;

      // No-op detection (per spec §5.10): if the task would end up at its
      // current slot in the same column, the backend now responds with
      // `400 Move did not change the task position…` instead of a silent
      // 200. Catch it on the FE so we never fire the request at all.
      const sameColumn = fromMeta.statusId === targetStatusId;
      if (sameColumn && position === fromMeta.taskIdx) return;

      // Optimistic UI update first.
      onOptimisticMove?.({
        taskId: active.id,
        fromStatusId: fromMeta.statusId,
        toStatusId: targetStatusId,
        toIndex: position,
      });

      onMove?.({
        taskId: active.id,
        statusId: targetStatusId,
        fromStatusId: fromMeta.statusId,
        position,
      });
    },
    [columns, onMove, onOptimisticMove, taskIndex]
  );

  const handleDragEnd = useCallback(
    (event) => {
      const wasColumnDrag =
        event.active?.data?.current?.type === 'column-handle';
      setActiveTask(null);
      setActiveColumnStatus(null);
      if (wasColumnDrag) {
        handleColumnDragEnd(event);
      } else {
        handleTaskDragEnd(event);
      }
    },
    [handleColumnDragEnd, handleTaskDragEnd]
  );

  // For the column-drag overlay we render a faded clone of the column header.
  const activeColumn = useMemo(
    () =>
      activeColumnStatus
        ? columns.find((c) => getColumnStatusId(c) === activeColumnStatus)
        : null,
    [columns, activeColumnStatus]
  );

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-container/30 dark:bg-primary/15 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[36px] text-primary">
            view_kanban
          </span>
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-1">
          The board is empty
        </h3>
        <p className="text-sm text-on-surface-variant max-w-md">
          A board needs at least one <strong>status</strong> to act as a
          column (e.g. "To Do", "In Progress", "Done"). Statuses are
          configured per workspace — once they're set up here, your tasks
          will appear in the matching column.
        </p>
        <p className="text-xs text-on-surface-variant max-w-md mt-3">
          If you've already configured statuses but don't see them, try
          refreshing the board.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1 overflow-x-auto custom-scrollbar pb-2 -mx-2 px-2">
        {/*
          Two nested SortableContexts share the same DnDContext:
            - Outer (here): the columns row, sorted horizontally. Active item
              is the column being dragged via its grip handle.
            - Inner (TaskColumn): each column's task list, sorted vertically.
          The dnd-kit `data.type` on each draggable disambiguates them in
          handleDragEnd, so a card drag never accidentally reorders columns
          and vice-versa.
        */}
        <SortableContext
          items={columnIds}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-3 min-h-full items-start">
            {columns.map((col) => {
              const status =
                typeof col.status === 'object'
                  ? col.status
                  : { _id: col.status, name: 'Status' };
              return (
                <SortableTaskColumn
                  key={status._id ?? 'no-status'}
                  status={status}
                  tasks={col.tasks || []}
                  onOpenTask={onOpenTask}
                  onQuickCreate={onQuickCreate}
                  canCreate={canCreate}
                  draggable={canReorderColumns}
                />
              );
            })}
          </div>
        </SortableContext>
      </div>

      <DragOverlay dropAnimation={{ duration: 200 }}>
        {activeTask ? (
          <div className="w-72 sm:w-80 rotate-1">
            <TaskCard task={activeTask} isDragOverlay />
          </div>
        ) : activeColumn ? (
          <div className="w-72 sm:w-80 rotate-1 rounded-xl border border-primary/40 bg-surface dark:bg-surface-container-low/90 shadow-2xl px-3 py-2 flex items-center gap-2 ring-2 ring-primary-container dark:ring-primary">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor:
                  (typeof activeColumn.status === 'object'
                    ? activeColumn.status.color
                    : null) || '#94a3b8',
              }}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface truncate">
              {(typeof activeColumn.status === 'object'
                ? activeColumn.status.name
                : 'Status') || 'Status'}
            </span>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-container-low dark:bg-surface-container-highest/50 text-on-surface-variant">
              {(activeColumn.tasks || []).length}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;
