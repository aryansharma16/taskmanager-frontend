import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  fetchBoard,
  createTask,
  updateTask,
  archiveTask,
  restoreTask,
  moveTask,
  fetchSubtasks,
  fetchAssignments,
  addAssignment,
  updateAssignmentRole,
  removeAssignment,
  optimisticMoveTask,
  clearTaskError,
  clearTaskSuccess,
} from '../../features/tasks/taskSlice';
import {
  fetchWorkspaceById,
  fetchWorkspaceMembers,
} from '../../features/workspaces/workspaceSlice';
import {
  fetchStatuses,
  reorderStatuses,
  selectStatusesForWorkspace,
} from '../../features/statuses/statusSlice';
import TaskBoard from '../../components/tasks/TaskBoard';
import TaskDetailPanel from '../../components/tasks/TaskDetailPanel';
import DynamicMessagePopUp from '../../components/DynamicMessagePopUp';
import { getColumnStatusId, getStatusId } from '../../components/tasks/taskHelpers';

// Stable empty-array reference so selectors that fall back to "no data yet"
// don't return a fresh array on every render (which causes useSelector to
// warn about non-memoized output).
const EMPTY_ARRAY = [];

/**
 * The Task Management page for a single workspace. Owns:
 *   - Loading the workspace, board, statuses, priorities, members.
 *   - Managing the slide-over panel state (create / edit / subtask).
 *   - Dispatching all mutations and refetching after each.
 *   - Owning a single confirmation popup for destructive actions.
 *
 * Permission strings (from backend hybrid RBAC):
 *   read:task | create:task | update:task | delete:task | assign:task
 *
 * The current org role's permissions live on `auth.user.organisations[i].role`
 * in our login response; that array lookup is brittle, so we play it safe and
 * gate UI optimistically — server still enforces the truth.
 */
const WorkspaceTasks = () => {
  const { id: workspaceId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const board = useSelector((state) => state.tasks.board);
  // The statuses sub-API is the canonical list — the board response only
  // reflects statuses that already exist in `/tasks/board` at fetch time, so
  // a status created in another tab (or right after creation, before the next
  // board refresh) wouldn't otherwise show up. Fall back to the board-derived
  // list only if the dedicated slice hasn't loaded yet.
  const dedicatedStatuses = useSelector((s) =>
    selectStatusesForWorkspace(s, workspaceId)
  );
  const boardDerivedStatuses = useSelector((state) => state.tasks.statuses);
  const statuses = dedicatedStatuses.length
    ? dedicatedStatuses
    : boardDerivedStatuses;
  const priorities = useSelector((state) => state.tasks.priorities);
  const subtasksByTask = useSelector((state) => state.tasks.subtasksByTask);
  const assignmentsByTask = useSelector((state) => state.tasks.assignmentsByTask);
  const taskLoading = useSelector((state) => state.tasks.loading);
  const boardLoading = useSelector((state) => state.tasks.boardLoading);
  const taskError = useSelector((state) => state.tasks.error);
  const taskSuccess = useSelector((state) => state.tasks.successMessage);

  // Read the workspace pieces individually so each selector returns a stable
  // reference, then derive what we need with useMemo. This dodges the
  // "selector returned a new reference" dev warning.
  const selectedWorkspace = useSelector((s) => s.workspaces.selectedWorkspace);
  const workspaceItems = useSelector((s) => s.workspaces.items);
  const workspace = useMemo(() => {
    if (selectedWorkspace?.workspace?._id === workspaceId) return selectedWorkspace.workspace;
    if (selectedWorkspace?._id === workspaceId) return selectedWorkspace;
    return workspaceItems?.find?.((w) => w._id === workspaceId) || null;
  }, [selectedWorkspace, workspaceItems, workspaceId]);

  // membersByWorkspace stores { items, page, limit, total } per workspace,
  // not a bare array. Pull the items list specifically.
  const workspaceMembers = useSelector(
    (state) =>
      state.workspaces.membersByWorkspace?.[workspaceId]?.items || EMPTY_ARRAY
  );

  // ----- Local UI state -----
  const [panel, setPanel] = useState({ open: false, task: null, parentTask: null });
  const [popup, setPopup] = useState(null);
  const [filter, setFilter] = useState({ q: '', priorityId: '', assigneeId: '' });

  // ----- Effects: load all the data we need -----
  const refreshBoard = () => dispatch(fetchBoard({ workspaceId }));

  useEffect(() => {
    if (!workspaceId) return;
    dispatch(fetchWorkspaceById(workspaceId));
    dispatch(fetchWorkspaceMembers({ id: workspaceId }));
    dispatch(fetchStatuses({ workspaceId, withTaskCounts: false }));
    dispatch(fetchBoard({ workspaceId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Re-fetch the panel-specific data when the panel target changes.
  useEffect(() => {
    if (!panel.open || !panel.task) return;
    dispatch(fetchSubtasks({ workspaceId, taskId: panel.task._id }));
    dispatch(fetchAssignments({ workspaceId, taskId: panel.task._id }));
  }, [panel.open, panel.task, workspaceId, dispatch]);

  // Derive the toast directly from redux state so we don't have to keep a
  // local mirror in sync. A single timer effect clears the redux flag.
  const toast = taskError
    ? { kind: 'error', text: taskError }
    : taskSuccess
    ? { kind: 'success', text: taskSuccess }
    : null;

  useEffect(() => {
    if (!taskError && !taskSuccess) return undefined;
    const t = setTimeout(() => {
      dispatch(clearTaskError());
      dispatch(clearTaskSuccess());
    }, 3000);
    return () => clearTimeout(t);
  }, [taskError, taskSuccess, dispatch]);

  // ----- Filtered board view -----
  // The column order on screen follows the dedicated statuses slice — that's
  // the source of truth for `order` and is what /statuses/reorder rewrites.
  // The board response is also sorted server-side, but during the optimistic
  // window of a column reorder the board's snapshot is stale by one round
  // trip; sorting against `statuses` keeps the UI from snapping back.
  const filteredColumns = useMemo(() => {
    const q = filter.q.trim().toLowerCase();

    const orderById = new Map();
    statuses.forEach((s, i) => orderById.set(s._id, i));

    const sortedCols = [...board.columns].sort((a, b) => {
      const ai = orderById.get(getColumnStatusId(a));
      const bi = orderById.get(getColumnStatusId(b));
      // Unknown columns (e.g. the synthetic "no status" bucket) sort last.
      const aRank = ai === undefined ? Number.MAX_SAFE_INTEGER : ai;
      const bRank = bi === undefined ? Number.MAX_SAFE_INTEGER : bi;
      return aRank - bRank;
    });

    return sortedCols.map((col) => ({
      ...col,
      tasks: (col.tasks || []).filter((t) => {
        if (q) {
          const hay = `${t.title || ''} ${t.description || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (filter.priorityId) {
          const pId = typeof t.priority === 'object' ? t.priority?._id : t.priority;
          if (pId !== filter.priorityId) return false;
        }
        if (filter.assigneeId) {
          const ids = (t.assignees || []).map((a) =>
            typeof a === 'object' ? a._id : a
          );
          if (!ids.includes(filter.assigneeId)) return false;
        }
        return true;
      }),
    }));
  }, [board.columns, filter, statuses]);

  const totalTasks = useMemo(
    () => board.columns.reduce((acc, c) => acc + (c.tasks?.length || 0), 0),
    [board.columns]
  );
  const visibleTasks = useMemo(
    () => filteredColumns.reduce((acc, c) => acc + c.tasks.length, 0),
    [filteredColumns]
  );

  // ----- Panel handlers -----
  const openCreatePanel = (parentTask = null) => {
    setPanel({ open: true, task: null, parentTask });
  };
  const openEditPanel = (task) => {
    setPanel({ open: true, task, parentTask: null });
  };
  const closePanel = () => {
    setPanel({ open: false, task: null, parentTask: null });
  };

  // ----- Mutation handlers -----
  const handleSubmit = (payload) => {
    if (panel.task) {
      dispatch(updateTask({ workspaceId, taskId: panel.task._id, data: payload }))
        .unwrap()
        .then((updated) => {
          setPanel((p) => ({ ...p, task: updated || p.task }));
          refreshBoard();
        })
        .catch(() => {});
    } else {
      const parent = panel.parentTask;
      dispatch(createTask({ workspaceId, data: payload }))
        .unwrap()
        .then((created) => {
          if (parent) {
            // After creating a subtask: snap back to the parent so the user
            // can see their new subtask listed.
            setPanel({ open: true, task: parent, parentTask: null });
            dispatch(fetchSubtasks({ workspaceId, taskId: parent._id }));
          } else if (created) {
            // After creating a top-level task: keep the panel open in edit
            // mode so the user can immediately add description / assignees.
            setPanel({ open: true, task: created, parentTask: null });
          } else {
            closePanel();
          }
          refreshBoard();
        })
        .catch(() => {});
    }
  };

  const handleQuickCreate = ({ title, statusId }) => {
    dispatch(
      createTask({ workspaceId, data: { title, statusId } })
    )
      .unwrap()
      .then(() => refreshBoard())
      .catch(() => {});
  };

  const handleDelete = () => {
    if (!panel.task) return;
    const t = panel.task;
    setPopup({
      variant: 'danger',
      title: 'Archive task?',
      message: `"${t.title}" will be archived. Subtasks underneath will also be archived. You can restore it later from the archived view.`,
      confirmText: 'Archive',
      cancelText: 'Cancel',
      onConfirm: () => {
        dispatch(archiveTask({ workspaceId, taskId: t._id }))
          .unwrap()
          .then(() => {
            setPopup(null);
            closePanel();
            refreshBoard();
          })
          .catch(() => setPopup(null));
      },
      onCancel: () => setPopup(null),
    });
  };

  const handleRestore = () => {
    if (!panel.task) return;
    dispatch(restoreTask({ workspaceId, taskId: panel.task._id }))
      .unwrap()
      .then((restored) => {
        if (restored) setPanel((p) => ({ ...p, task: restored }));
        refreshBoard();
      })
      .catch(() => {});
  };

  // ----- Drag-and-drop handlers -----
  const handleOptimisticMove = (params) => {
    dispatch(optimisticMoveTask(params));
  };
  // We use the spec's recommended Style A.1 payload: a 0-based `position`
  // index in the target column. It sidesteps the prev/next swap bug that
  // beforeId/afterId is famous for, and dnd-kit hands us the index for free.
  // The backend computes `order` from `position` and the post-removal
  // neighbours, so we never have to think about fractional spacing here.
  const handleMove = ({ taskId, statusId, position }) => {
    dispatch(
      moveTask({
        workspaceId,
        taskId,
        data: { statusId, position },
      })
    )
      .unwrap()
      .catch(() => {
        // The slice keeps the optimistic update; refetch to heal.
        refreshBoard();
      });
  };

  // Column drag-and-drop. The full `orderedIds` array is required by
  // `PUT /statuses/reorder` — every status id in the workspace exactly once.
  // The optimistic update lives in the statuses slice; a rejection refetches
  // both endpoints so the UI heals back to the server's truth.
  const handleColumnReorder = (orderedIds) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
    dispatch(reorderStatuses({ workspaceId, orderedIds }))
      .unwrap()
      .catch(() => {
        dispatch(fetchStatuses({ workspaceId, withTaskCounts: false }));
        refreshBoard();
      });
  };

  // ----- Subtask + assignment handlers (delegated to the panel) -----
  const handleCreateSubtask = (title) => {
    if (!panel.task) return;
    const parent = panel.task;
    const fallbackStatus = getStatusId(parent) || statuses[0]?._id;
    dispatch(
      createTask({
        workspaceId,
        data: { title, parentTaskId: parent._id, statusId: fallbackStatus },
      })
    )
      .unwrap()
      .then(() => {
        dispatch(fetchSubtasks({ workspaceId, taskId: parent._id }));
        refreshBoard();
      })
      .catch(() => {});
  };

  const handleOpenSubtask = (subtask) => {
    setPanel({ open: true, task: subtask, parentTask: null });
  };

  const handleAddAssignment = ({ userId, role }) => {
    if (!panel.task) return;
    dispatch(
      addAssignment({ workspaceId, taskId: panel.task._id, userId, role })
    )
      .unwrap()
      .then(() => refreshBoard())
      .catch(() => {});
  };

  const handleChangeAssignmentRole = (assignmentId, role) => {
    if (!panel.task) return;
    dispatch(
      updateAssignmentRole({
        workspaceId,
        taskId: panel.task._id,
        assignmentId,
        role,
      })
    )
      .unwrap()
      .catch(() => {});
  };

  const handleRemoveAssignment = (assignmentId) => {
    if (!panel.task) return;
    dispatch(
      removeAssignment({
        workspaceId,
        taskId: panel.task._id,
        assignmentId,
      })
    )
      .unwrap()
      .then(() => refreshBoard())
      .catch(() => {});
  };

  // ----- Render -----
  const isWorkspaceArchived = workspace?.isActive === false;
  const canCreate = !isWorkspaceArchived;

  return (
    <div className="animate-fade-in flex flex-col flex-1 min-h-0">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-lg shadow-lg text-xs font-semibold border ${
            toast.kind === 'error'
              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1 sm:flex-initial">
          <Link
            to="/workspaces"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant hover:text-primary mb-1"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Workspaces
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2 truncate">
            {workspace?.name || 'Workspace'}
            {isWorkspaceArchived && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Archived
              </span>
            )}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5 truncate">
            {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'} across {board.columns.length}{' '}
            {board.columns.length === 1 ? 'column' : 'columns'}
            {visibleTasks !== totalTasks && (
              <span className="ml-1">· {visibleTasks} matching filters</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[10rem] sm:flex-initial">
            <input
              type="search"
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search tasks…"
              className="pl-8 pr-3 py-2 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 w-full sm:w-56"
            />
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
          </div>

          {priorities.length > 0 && (
            <select
              value={filter.priorityId}
              onChange={(e) => setFilter((f) => ({ ...f, priorityId: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 max-w-[10rem]"
            >
              <option value="">All priorities</option>
              {priorities.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {workspaceMembers.length > 0 && (
            <select
              value={filter.assigneeId}
              onChange={(e) => setFilter((f) => ({ ...f, assigneeId: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 max-w-[10rem]"
            >
              <option value="">All assignees</option>
              {workspaceMembers.map((m) => {
                const u = m.user || m;
                return (
                  <option key={u._id} value={u._id}>
                    {u.name || u.email}
                  </option>
                );
              })}
            </select>
          )}

          {(filter.q || filter.priorityId || filter.assigneeId) && (
            <button
              type="button"
              onClick={() => setFilter({ q: '', priorityId: '', assigneeId: '' })}
              className="text-[11px] font-semibold text-on-surface-variant hover:text-primary px-2"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={refreshBoard}
            className="p-2 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low hover:bg-surface-container-low text-on-surface-variant"
            title="Refresh"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                boardLoading ? 'animate-spin' : ''
              }`}
            >
              refresh
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/workspaces/${workspaceId}/statuses`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-on-surface-variant hover:text-on-surface"
            title="Manage statuses (Kanban columns)"
          >
            <span className="material-symbols-outlined text-[16px]">view_column</span>
            <span className="hidden md:inline">Manage statuses</span>
          </button>

          <button
            type="button"
            disabled={!canCreate || statuses.length === 0}
            onClick={() => openCreatePanel(null)}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            title={
              statuses.length === 0
                ? 'Define statuses first'
                : isWorkspaceArchived
                ? 'Restore workspace to add tasks'
                : 'Create task'
            }
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">New task</span>
          </button>
        </div>
      </div>

      {/* Workspace archived banner */}
      {isWorkspaceArchived && (
        <div className="mb-3 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">archive</span>
          <span>
            This workspace is archived. Tasks are read-only until you restore it from the
            <Link to="/workspaces" className="underline font-semibold ml-1">
              workspaces page
            </Link>
            .
          </span>
        </div>
      )}

      {/* Board */}
      {boardLoading && board.columns.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-on-surface-variant">Loading board…</p>
          </div>
        </div>
      ) : statuses.length === 0 && board.columns.length === 0 ? (
        // No Kanban columns defined yet — a board with zero statuses can't
        // render anything useful, so we promote the "create statuses" path.
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md text-center bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 p-8">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary-container/15 dark:bg-primary/15 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px] text-primary">
                view_column
              </span>
            </div>
            <p className="text-on-surface font-semibold mb-1">No statuses yet</p>
            <p className="text-sm text-on-surface-variant mb-4">
              Add at least one status (e.g. <span className="font-semibold">Backlog</span>,{' '}
              <span className="font-semibold">In Progress</span>,{' '}
              <span className="font-semibold">Done</span>) to render the Kanban board and start
              creating tasks.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/workspaces/${workspaceId}/statuses`)}
              disabled={isWorkspaceArchived}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-primary-container dark:bg-primary text-white dark:text-on-primary hover:brightness-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Define statuses
            </button>
          </div>
        </div>
      ) : (
        <TaskBoard
          columns={filteredColumns}
          onOpenTask={openEditPanel}
          onMove={handleMove}
          onOptimisticMove={handleOptimisticMove}
          onColumnReorder={handleColumnReorder}
          onQuickCreate={handleQuickCreate}
          canCreate={canCreate}
          canReorderColumns={canCreate}
        />
      )}

      {/* Slide-over for create / edit */}
      <TaskDetailPanel
        open={panel.open}
        task={panel.task}
        parentTask={panel.parentTask}
        statuses={statuses}
        priorities={priorities}
        workspaceMembers={workspaceMembers}
        subtasks={panel.task ? subtasksByTask[panel.task._id] || [] : []}
        assignments={panel.task ? assignmentsByTask[panel.task._id] || [] : []}
        onClose={closePanel}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onRestore={handleRestore}
        onCreateSubtask={handleCreateSubtask}
        onOpenSubtask={handleOpenSubtask}
        onAddAssignment={handleAddAssignment}
        onChangeAssignmentRole={handleChangeAssignmentRole}
        onRemoveAssignment={handleRemoveAssignment}
        canEdit={canCreate}
        canDelete={canCreate}
        canAssign={canCreate}
        canCreateSubtask={canCreate}
        submitting={taskLoading}
      />

      {/* Confirmation popup */}
      {popup && <DynamicMessagePopUp {...popup} />}
    </div>
  );
};

export default WorkspaceTasks;
