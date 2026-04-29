import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  fetchStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  reorderStatuses,
  clearStatusError,
  clearStatusSuccess,
  selectStatusesForWorkspace,
} from '../../features/statuses/statusSlice';
import { fetchWorkspaceById } from '../../features/workspaces/workspaceSlice';
import DynamicMessagePopUp from '../../components/DynamicMessagePopUp';

// A small but pleasant set of swatches that read well on both themes. Users
// can still type a custom hex.
const COLOR_SWATCHES = [
  '#94a3b8', // slate (default)
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
];

const DEFAULT_COLOR = '#94a3b8';

// `null` is the API's sentinel for "clear the status reference on these
// tasks" — we represent it as the literal string "null" because that's
// what the backend's reassignTo param expects, and because regular form
// state doesn't round-trip a real null cleanly.
const REASSIGN_NULL = 'null';

const isHexColor = (s) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());

const EMPTY_FORM = { name: '', color: DEFAULT_COLOR };

/**
 * One sortable row in the pipeline. Drag listeners live on a small grip
 * button so the rest of the row (color dot, edit/delete) stays clickable.
 */
const SortableStatusRow = ({
  status,
  position,
  isEditing,
  canMutate,
  onEdit,
  onDelete,
}) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: status._id,
    disabled: !canMutate,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const taskCount = status.taskCount ?? 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isEditing
          ? 'border-primary/40 bg-primary-container/5 dark:bg-primary/10'
          : 'border-outline-variant/30 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low/40 hover:border-outline-variant/60'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onMouseDown={(e) => e.stopPropagation()}
        disabled={!canMutate}
        className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 cursor-grab active:cursor-grabbing disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        title={canMutate ? 'Drag to reorder' : 'Restore the workspace to reorder'}
        aria-label="Reorder status"
      >
        <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
      </button>
      <span
        className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-surface-container-low/60 dark:bg-surface-container-highest/40 text-on-surface-variant flex-shrink-0"
        title="Pipeline position"
      >
        #{position + 1}
      </span>
      <span
        className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-on-background/10"
        style={{ backgroundColor: status.color || DEFAULT_COLOR }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface truncate">
          {status.name}
        </p>
        <p className="text-[11px] font-mono text-on-surface-variant">
          {(status.color || DEFAULT_COLOR).toLowerCase()}
        </p>
      </div>
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          taskCount > 0
            ? 'bg-primary-container/20 text-primary-container dark:bg-primary/20 dark:text-primary'
            : 'bg-surface-container-highest/40 text-on-surface-variant'
        }`}
        title={`${taskCount} active task${taskCount === 1 ? '' : 's'}`}
      >
        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(status)}
          disabled={!canMutate}
          className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Edit status"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(status)}
          disabled={!canMutate}
          className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error/10 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Delete status"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </li>
  );
};

/**
 * Status (Kanban column) management for a single workspace.
 *
 * Backend RBAC:
 *   read:task    — list/get statuses
 *   manage:status — create / edit / delete
 *
 * Server still enforces; we only soft-disable controls when the workspace
 * itself is archived to nudge the user toward restoring first.
 */
const StatusManagement = () => {
  const { id: workspaceId } = useParams();
  const dispatch = useDispatch();

  const statuses = useSelector((s) => selectStatusesForWorkspace(s, workspaceId));
  const loading = useSelector((s) => s.statuses.loading);
  const mutating = useSelector((s) => s.statuses.mutating);
  const error = useSelector((s) => s.statuses.error);
  const successMessage = useSelector((s) => s.statuses.successMessage);

  // Pull the workspace from any of the slice's known places so we can render
  // its name and respect its archived flag without an extra fetch on every
  // navigation.
  const selectedWorkspace = useSelector((s) => s.workspaces.selectedWorkspace);
  const workspaceItems = useSelector((s) => s.workspaces.items);
  const workspace = useMemo(() => {
    if (selectedWorkspace?.workspace?._id === workspaceId) return selectedWorkspace.workspace;
    if (selectedWorkspace?._id === workspaceId) return selectedWorkspace;
    return workspaceItems?.find?.((w) => w._id === workspaceId) || null;
  }, [selectedWorkspace, workspaceItems, workspaceId]);

  const isWorkspaceArchived = workspace?.isActive === false;
  const canMutate = !isWorkspaceArchived;

  // Form state — single inline form drives both "Create" (when editingId is
  // null) and "Edit" (when editingId is a status id). Keeping one form keeps
  // the layout calm; switching modes is a tap.
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  // Delete flow has two stages: confirm, then (if blocked) reassign.
  const [deleteState, setDeleteState] = useState(null);
  // Shape:
  //   { stage: 'confirm', status }
  //   { stage: 'reassign', status, reassignTo }

  // Initial load
  useEffect(() => {
    if (!workspaceId) return;
    dispatch(fetchWorkspaceById(workspaceId));
    dispatch(fetchStatuses({ workspaceId, withTaskCounts: true }));
  }, [workspaceId, dispatch]);

  // Auto-dismiss the toast strip
  useEffect(() => {
    if (!error && !successMessage) return undefined;
    const t = setTimeout(() => {
      dispatch(clearStatusError());
      dispatch(clearStatusSuccess());
    }, 4000);
    return () => clearTimeout(t);
  }, [error, successMessage, dispatch]);

  // Active-task tally is a header stat; loops once across the same array we
  // already render, so cheap.
  const totalActiveTasks = useMemo(
    () => statuses.reduce((acc, s) => acc + (s.taskCount || 0), 0),
    [statuses]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
  };

  const startEdit = (status) => {
    setEditingId(status._id);
    setForm({
      name: status.name || '',
      color: status.color || DEFAULT_COLOR,
    });
    setFormError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const name = form.name.trim();
    if (!name) {
      setFormError('Status name is required.');
      return;
    }
    if (form.color && !isHexColor(form.color)) {
      setFormError('Color must be a valid hex value (e.g. #3b82f6).');
      return;
    }

    const payload = { name, color: form.color || undefined };

    const action = editingId
      ? updateStatus({ workspaceId, statusId: editingId, data: payload })
      : createStatus({ workspaceId, data: payload });

    dispatch(action)
      .unwrap()
      .then(() => {
        resetForm();
      })
      .catch(() => {
        // The slice already exposes `error` as a global toast; nothing else to do.
      });
  };

  // ---------- Delete flow ----------
  const openDelete = (status) => {
    setDeleteState({ stage: 'confirm', status });
  };

  const closeDelete = () => setDeleteState(null);

  const performDelete = (reassignTo) => {
    if (!deleteState?.status) return;
    const status = deleteState.status;
    dispatch(
      deleteStatus({
        workspaceId,
        statusId: status._id,
        reassignTo,
      })
    )
      .unwrap()
      .then(() => {
        if (editingId === status._id) resetForm();
        closeDelete();
      })
      .catch((err) => {
        // The backend blocks delete when active tasks reference the status
        // and no reassignTo was provided. We don't have a stable error code
        // to key off of, so fall back to a heuristic on the message and the
        // local taskCount: if tasks are present, escalate to the reassign
        // picker instead of just toasting an error.
        const msg = err?.message || '';
        const looksBlocked =
          /reassign/i.test(msg) ||
          /active task/i.test(msg) ||
          (status.taskCount || 0) > 0;
        if (looksBlocked && reassignTo === undefined) {
          setDeleteState({ stage: 'reassign', status, reassignTo: '' });
        } else {
          // Genuine failure — keep the dialog open so the toast lands above it
          // and the user can decide whether to retry.
        }
      });
  };

  // Sibling list for the reassignment picker — exclude the status being
  // deleted, since you can't reassign onto yourself.
  const siblingsForReassign = useMemo(() => {
    if (!deleteState?.status) return [];
    return statuses.filter((s) => s._id !== deleteState.status._id);
  }, [statuses, deleteState]);

  // ---------- Drag-to-reorder ----------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortableIds = useMemo(() => statuses.map((s) => s._id), [statuses]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = sortableIds.indexOf(active.id);
    const toIdx = sortableIds.indexOf(over.id);
    if (fromIdx === -1 || toIdx === -1) return;
    const orderedIds = arrayMove(sortableIds, fromIdx, toIdx);
    dispatch(reorderStatuses({ workspaceId, orderedIds }))
      .unwrap()
      .catch(() => {
        // Heal: refetch the canonical order. The slice's optimistic update
        // already rewrote local state, so we need the server's truth back.
        dispatch(fetchStatuses({ workspaceId, withTaskCounts: true }));
      });
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Toast strip */}
      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => dispatch(clearStatusError())} aria-label="Dismiss">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-secondary-container text-on-secondary-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => dispatch(clearStatusSuccess())} aria-label="Dismiss">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/workspaces/${workspaceId}/tasks`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant hover:text-primary mb-1"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Board
          </Link>
          <h1 className="font-['Manrope'] dark:font-['Space_Grotesk'] text-[26px] font-bold dark:font-semibold text-on-surface tracking-tight flex items-center gap-2">
            Statuses
            {isWorkspaceArchived && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Workspace archived
              </span>
            )}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Kanban columns for{' '}
            <span className="font-semibold text-on-surface">
              {workspace?.name || 'this workspace'}
            </span>
            . The board renders one column per status, sorted by name.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/workspaces/${workspaceId}/tasks`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-outline-variant/40 bg-surface dark:bg-surface-container-low text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">view_kanban</span>
            Open board
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Statuses', value: statuses.length, icon: 'view_column', tone: 'primary' },
          {
            label: 'Active tasks',
            value: totalActiveTasks,
            icon: 'task_alt',
            tone: 'secondary',
          },
          {
            label: 'Empty columns',
            value: statuses.filter((s) => !s.taskCount).length,
            icon: 'inventory_2',
            tone: 'tertiary',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.tone === 'primary'
                  ? 'bg-primary-container/15 text-primary-container dark:bg-primary/15 dark:text-primary'
                  : stat.tone === 'secondary'
                  ? 'bg-secondary-container/30 text-on-secondary-container dark:bg-secondary/15 dark:text-secondary'
                  : 'bg-tertiary-container/30 text-tertiary-container dark:bg-tertiary/15 dark:text-tertiary'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-on-surface-variant">
                {stat.label}
              </p>
              <p className="text-xl font-bold text-on-surface">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        {/* List */}
        <div className="bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 p-4 sm:p-6 relative min-h-[200px]">
          {loading && statuses.length === 0 && (
            <div className="absolute inset-0 bg-surface-container-lowest/50 dark:bg-background/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
              <span className="material-symbols-outlined animate-spin text-primary text-[28px]">
                refresh
              </span>
            </div>
          )}

          {statuses.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary-container/15 dark:bg-primary/15 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[28px] text-primary">
                  view_column
                </span>
              </div>
              <p className="text-on-surface font-semibold mb-1">No statuses yet</p>
              <p className="text-sm text-on-surface-variant">
                Add at least one status so the board has columns to render. Try{' '}
                <span className="font-semibold">Backlog</span>,{' '}
                <span className="font-semibold">In Progress</span>, and{' '}
                <span className="font-semibold">Done</span> to start.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-on-surface-variant mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
                Drag rows to reorder the pipeline. The same order drives the
                board's left-to-right column layout.
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
                    {statuses.map((status, idx) => (
                      <SortableStatusRow
                        key={status._id}
                        status={status}
                        position={idx}
                        isEditing={editingId === status._id}
                        canMutate={canMutate}
                        onEdit={startEdit}
                        onDelete={openDelete}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>

        {/* Create / Edit form */}
        <div className="bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 p-4 sm:p-6 h-fit lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">
                {editingId ? 'edit' : 'add_circle'}
              </span>
              {editingId ? 'Edit status' : 'New status'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[11px] font-semibold text-on-surface-variant hover:text-primary"
              >
                Cancel edit
              </button>
            )}
          </div>

          {isWorkspaceArchived && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px]">archive</span>
              <span>
                Restore the workspace before editing its statuses.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-error-container/40 text-on-error-container border border-error/30 rounded-lg px-3 py-2 text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">
                Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={60}
                disabled={!canMutate}
                className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none disabled:opacity-60"
                placeholder="In Progress"
                required
              />
              <p className="text-[11px] text-on-surface-variant">
                Names must be unique within the workspace (case-insensitive).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_SWATCHES.map((c) => {
                  const active = (form.color || '').toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      disabled={!canMutate}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        active
                          ? 'border-on-surface scale-110'
                          : 'border-transparent hover:scale-110'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      style={{ backgroundColor: c }}
                      aria-label={`Use color ${c}`}
                      title={c}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={isHexColor(form.color || '') ? form.color : DEFAULT_COLOR}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  disabled={!canMutate}
                  className="w-10 h-10 rounded cursor-pointer border border-outline-variant/40 disabled:opacity-50"
                  aria-label="Pick a custom color"
                />
                <input
                  type="text"
                  value={form.color || ''}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  disabled={!canMutate}
                  maxLength={7}
                  className="flex-1 px-3 py-2 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm font-mono text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none disabled:opacity-60"
                  placeholder="#94a3b8"
                />
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-lg border border-outline-variant/30 dark:border-outline-variant/20 bg-surface-container-low/40 dark:bg-surface-container-highest/30 p-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant mb-2">
                Preview
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface dark:bg-surface-container text-on-surface-variant text-xs px-2.5 py-1 font-semibold uppercase tracking-wide">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isHexColor(form.color || '') ? form.color : DEFAULT_COLOR,
                  }}
                />
                <span className="truncate max-w-[180px]">
                  {form.name.trim() || 'Status name'}
                </span>
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!canMutate || mutating}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {mutating && (
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    refresh
                  </span>
                )}
                {editingId ? 'Save changes' : 'Create status'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 border border-outline-variant/50 text-on-surface rounded-lg font-semibold text-sm hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* First confirmation: a status with no active tasks can be deleted
          straight away; one with tasks falls through to the reassign step. */}
      <DynamicMessagePopUp
        isOpen={deleteState?.stage === 'confirm'}
        variant="danger"
        title="Delete this status?"
        message={
          deleteState?.status ? (
            <>
              <span className="font-semibold text-on-surface">
                {deleteState.status.name}
              </span>{' '}
              will be removed from this workspace.
              {(deleteState.status.taskCount || 0) > 0 ? (
                <>
                  {' '}It currently holds{' '}
                  <span className="font-semibold text-on-surface">
                    {deleteState.status.taskCount}
                  </span>{' '}
                  active task
                  {deleteState.status.taskCount === 1 ? '' : 's'} — you'll be asked
                  where to move them next.
                </>
              ) : (
                ' This action cannot be undone.'
              )}
            </>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={mutating}
        onConfirm={() => performDelete(undefined)}
        onCancel={closeDelete}
      />

      {/* Second step (only fires if the server / heuristic blocked the
          straight delete): pick a sibling to migrate to, or clear. */}
      <DynamicMessagePopUp
        isOpen={deleteState?.stage === 'reassign'}
        variant="warning"
        title="Where should the tasks go?"
        message={
          deleteState?.status ? (
            <>
              <span className="font-semibold text-on-surface">
                {deleteState.status.name}
              </span>{' '}
              still has active tasks. Pick a column to migrate them to, or clear
              their status entirely.
            </>
          ) : null
        }
        confirmLabel="Reassign and delete"
        cancelLabel="Cancel"
        loading={mutating}
        onConfirm={() => {
          if (!deleteState?.reassignTo) return;
          performDelete(deleteState.reassignTo);
        }}
        onCancel={closeDelete}
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface uppercase tracking-wider">
            Move active tasks to
          </label>
          <select
            value={deleteState?.reassignTo || ''}
            onChange={(e) =>
              setDeleteState((s) => (s ? { ...s, reassignTo: e.target.value } : s))
            }
            className="w-full px-3 py-2 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
          >
            <option value="">Select a destination…</option>
            {siblingsForReassign.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
                {typeof s.taskCount === 'number' ? ` (${s.taskCount})` : ''}
              </option>
            ))}
            <option value={REASSIGN_NULL}>— Clear status (unassigned column) —</option>
          </select>
          <p className="text-[11px] text-on-surface-variant">
            Archived tasks under this status are intentionally left alone.
          </p>
        </div>
      </DynamicMessagePopUp>
    </div>
  );
};

export default StatusManagement;
