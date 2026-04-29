import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// ============================================================================
// Tasks are nested under workspaces.
// Mount path: /api/workspaces/:id/tasks
// All thunks below take `workspaceId` as the first arg.
//
// Standard response envelope: { success, data, message? }
// On error: { success: false, error: '...' }
// ============================================================================

const handleError = (error, fallback) => {
  if (error.response && error.response.data) {
    return (
      error.response.data.error ||
      error.response.data.message ||
      fallback
    );
  }
  return error.message || fallback;
};

// ----------------------------------------------------------------------------
// Board / Lists
// ----------------------------------------------------------------------------

// GET /workspaces/:id/tasks/board
// Per the API spec, `data` is an *array* of `{ status, tasks }` buckets —
// one per status, plus an optional leading bucket where `status` is null
// for tasks that don't have one assigned. We also tolerate the wrapped
// `{ columns, statuses?, priorities? }` shape in case the backend ever
// switches to it.
export const fetchBoard = createAsyncThunk(
  'tasks/fetchBoard',
  async ({ workspaceId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/tasks/board`);
      const raw = response.data?.data;
      const columns = Array.isArray(raw) ? raw : raw?.columns || [];
      const statuses = Array.isArray(raw) ? undefined : raw?.statuses;
      const priorities = Array.isArray(raw) ? undefined : raw?.priorities;
      return { workspaceId, columns, statuses, priorities };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to fetch board'));
    }
  }
);

// GET /workspaces/:id/tasks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async ({ workspaceId, params } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/tasks`, {
        params,
      });
      return { workspaceId, items: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to fetch tasks'));
    }
  }
);

// ----------------------------------------------------------------------------
// Status / Priority lookups
// The backend has no dedicated /statuses or /priorities routes — both are
// expected to come back inline with the board response. We derive the
// statuses array from the board's columns. Priorities are taken from the
// board response if present; otherwise the priority filter just hides.
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Single task CRUD
// ----------------------------------------------------------------------------

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async ({ workspaceId, taskId }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}`
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to fetch task'));
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async ({ workspaceId, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/tasks`,
        data
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to create task'));
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ workspaceId, taskId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/workspaces/${workspaceId}/tasks/${taskId}`,
        data
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to update task'));
    }
  }
);

export const archiveTask = createAsyncThunk(
  'tasks/archiveTask',
  async ({ workspaceId, taskId }, { rejectWithValue }) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
      return { workspaceId, taskId };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to archive task'));
    }
  }
);

export const restoreTask = createAsyncThunk(
  'tasks/restoreTask',
  async ({ workspaceId, taskId }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/workspaces/${workspaceId}/tasks/${taskId}/restore`
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to restore task'));
    }
  }
);

// PATCH /workspaces/:id/tasks/:taskId/move
// data: { statusId, beforeId?, afterId? }
export const moveTask = createAsyncThunk(
  'tasks/moveTask',
  async ({ workspaceId, taskId, data }, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/workspaces/${workspaceId}/tasks/${taskId}/move`,
        data
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to move task'));
    }
  }
);

// ----------------------------------------------------------------------------
// Subtasks
// ----------------------------------------------------------------------------

export const fetchSubtasks = createAsyncThunk(
  'tasks/fetchSubtasks',
  async ({ workspaceId, taskId }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}/subtasks`
      );
      return { taskId, items: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to fetch subtasks'));
    }
  }
);

// ----------------------------------------------------------------------------
// Assignments (TaskAssignment join with role metadata)
// ----------------------------------------------------------------------------

export const fetchAssignments = createAsyncThunk(
  'tasks/fetchAssignments',
  async ({ workspaceId, taskId }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/tasks/${taskId}/assignments`
      );
      return { taskId, items: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to fetch assignments'));
    }
  }
);

export const addAssignment = createAsyncThunk(
  'tasks/addAssignment',
  async ({ workspaceId, taskId, userId, role = 'ASSIGNEE' }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/tasks/${taskId}/assignments`,
        { userId, role }
      );
      return { taskId, assignment: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to add assignee'));
    }
  }
);

export const updateAssignmentRole = createAsyncThunk(
  'tasks/updateAssignmentRole',
  async (
    { workspaceId, taskId, assignmentId, role },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put(
        `/workspaces/${workspaceId}/tasks/${taskId}/assignments/${assignmentId}`,
        { role }
      );
      return { taskId, assignment: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to update assignment'));
    }
  }
);

export const removeAssignment = createAsyncThunk(
  'tasks/removeAssignment',
  async ({ workspaceId, taskId, assignmentId }, { rejectWithValue }) => {
    try {
      await api.delete(
        `/workspaces/${workspaceId}/tasks/${taskId}/assignments/${assignmentId}`
      );
      return { taskId, assignmentId };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to remove assignment'));
    }
  }
);

// ----------------------------------------------------------------------------
// Slice
// ----------------------------------------------------------------------------

const initialState = {
  workspaceId: null,
  // Board structure: keyed by statusId. Each entry: { status, tasks }
  board: {
    columns: [], // [{ status, tasks }]
  },
  statuses: [],
  priorities: [],
  // Per-task caches
  selectedTask: null,
  subtasksByTask: {}, // { [taskId]: [task] }
  assignmentsByTask: {}, // { [taskId]: [assignment] }
  // UI state
  loading: false,
  boardLoading: false,
  error: null,
  successMessage: null,
};

// Helper: find a task in the board and return { columnIdx, taskIdx, task }
const locateTask = (state, taskId) => {
  for (let i = 0; i < state.board.columns.length; i += 1) {
    const col = state.board.columns[i];
    const idx = (col.tasks || []).findIndex((t) => t._id === taskId);
    if (idx !== -1) return { columnIdx: i, taskIdx: idx, task: col.tasks[idx] };
  }
  return null;
};

// Helper: get statusId off a task whether it's populated or just an id
const getStatusId = (task) => {
  if (!task?.status) return null;
  return typeof task.status === 'object' ? task.status._id : task.status;
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearTaskError: (state) => {
      state.error = null;
    },
    clearTaskSuccess: (state) => {
      state.successMessage = null;
    },
    clearSelectedTask: (state) => {
      state.selectedTask = null;
    },
    setSelectedTask: (state, action) => {
      state.selectedTask = action.payload;
    },
    // Optimistic move for snappy drag-and-drop. The server response (or its
    // rejection) is reconciled by the `moveTask` extra reducers below.
    optimisticMoveTask: (state, action) => {
      const { taskId, fromStatusId, toStatusId, toIndex } = action.payload;
      const fromCol = state.board.columns.find(
        (c) => (c.status?._id || c.status) === fromStatusId
      );
      const toCol = state.board.columns.find(
        (c) => (c.status?._id || c.status) === toStatusId
      );
      if (!fromCol || !toCol) return;

      const taskIdx = fromCol.tasks.findIndex((t) => t._id === taskId);
      if (taskIdx === -1) return;
      const [moved] = fromCol.tasks.splice(taskIdx, 1);

      // Optimistically reflect the new status on the moved task so its badge
      // updates immediately. The server response will overwrite this anyway.
      if (toCol.status && typeof toCol.status === 'object') {
        moved.status = toCol.status;
      } else {
        moved.status = toStatusId;
      }

      const insertAt = Math.max(0, Math.min(toIndex ?? toCol.tasks.length, toCol.tasks.length));
      toCol.tasks.splice(insertAt, 0, moved);
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- Board ----
      .addCase(fetchBoard.pending, (state) => {
        state.boardLoading = true;
        state.error = null;
      })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.boardLoading = false;
        const { workspaceId, columns, statuses, priorities } = action.payload || {};
        state.workspaceId = workspaceId;
        state.board.columns = columns || [];

        // Prefer an explicit `statuses` array if the backend includes one,
        // otherwise derive from the board columns (each column has its
        // populated `status`). Either way we end up with a clean lookup
        // list for dropdowns / filters.
        if (Array.isArray(statuses)) {
          state.statuses = statuses;
        } else {
          state.statuses = (columns || [])
            .map((c) => (typeof c.status === 'object' ? c.status : null))
            .filter(Boolean);
        }
        if (Array.isArray(priorities)) state.priorities = priorities;
      })
      .addCase(fetchBoard.rejected, (state, action) => {
        state.boardLoading = false;
        state.error = action.payload;
      })
      // ---- Single task ----
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.selectedTask = action.payload;
      })
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        const task = action.payload;
        if (task) {
          const statusId = getStatusId(task);
          const col = state.board.columns.find(
            (c) => (c.status?._id || c.status) === statusId
          );
          if (col) col.tasks.push(task);

          // If it's a subtask whose parent is currently expanded, refresh that bucket.
          const parentId =
            typeof task.parentTask === 'object'
              ? task.parentTask?._id
              : task.parentTask;
          if (parentId && state.subtasksByTask[parentId]) {
            state.subtasksByTask[parentId].push(task);
          }
        }
        state.successMessage = 'Task created';
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated) return;
        const located = locateTask(state, updated._id);
        if (located) {
          const newStatusId = getStatusId(updated);
          const oldStatusId =
            state.board.columns[located.columnIdx]?.status?._id ||
            state.board.columns[located.columnIdx]?.status;
          if (newStatusId && newStatusId !== oldStatusId) {
            state.board.columns[located.columnIdx].tasks.splice(located.taskIdx, 1);
            const target = state.board.columns.find(
              (c) => (c.status?._id || c.status) === newStatusId
            );
            if (target) target.tasks.push(updated);
          } else {
            state.board.columns[located.columnIdx].tasks[located.taskIdx] = updated;
          }
        }
        if (state.selectedTask && state.selectedTask._id === updated._id) {
          state.selectedTask = updated;
        }
        state.successMessage = 'Task updated';
      })
      .addCase(archiveTask.fulfilled, (state, action) => {
        const { taskId } = action.payload;
        state.board.columns.forEach((col) => {
          col.tasks = (col.tasks || []).filter((t) => t._id !== taskId);
        });
        if (state.selectedTask?._id === taskId) state.selectedTask = null;
        state.successMessage = 'Task archived';
      })
      .addCase(restoreTask.fulfilled, (state, action) => {
        const restored = action.payload;
        if (!restored) return;
        const statusId = getStatusId(restored);
        const col = state.board.columns.find(
          (c) => (c.status?._id || c.status) === statusId
        );
        if (col && !col.tasks.find((t) => t._id === restored._id)) {
          col.tasks.push(restored);
        }
        state.successMessage = 'Task restored';
      })
      .addCase(moveTask.fulfilled, (state, action) => {
        // Reconcile the server's authoritative position. We re-locate by id
        // and replace the row so order/version fields stay accurate.
        const moved = action.payload;
        if (!moved) return;
        const located = locateTask(state, moved._id);
        if (located) {
          state.board.columns[located.columnIdx].tasks[located.taskIdx] = moved;
        }
      })
      .addCase(moveTask.rejected, (state, action) => {
        // The optimistic move stays — caller is expected to refresh the board
        // on rejection so the UI heals.
        state.error = action.payload;
      })
      // ---- Subtasks ----
      .addCase(fetchSubtasks.fulfilled, (state, action) => {
        const { taskId, items } = action.payload;
        state.subtasksByTask[taskId] = items || [];
      })
      // ---- Assignments ----
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        const { taskId, items } = action.payload;
        state.assignmentsByTask[taskId] = items || [];
      })
      .addCase(addAssignment.fulfilled, (state, action) => {
        const { taskId, assignment } = action.payload;
        if (!assignment) return;
        if (!state.assignmentsByTask[taskId]) {
          state.assignmentsByTask[taskId] = [assignment];
        } else {
          state.assignmentsByTask[taskId].push(assignment);
        }
        state.successMessage = 'Assignee added';
      })
      .addCase(updateAssignmentRole.fulfilled, (state, action) => {
        const { taskId, assignment } = action.payload;
        const list = state.assignmentsByTask[taskId];
        if (list && assignment) {
          const idx = list.findIndex((a) => a._id === assignment._id);
          if (idx !== -1) list[idx] = assignment;
        }
        state.successMessage = 'Role updated';
      })
      .addCase(removeAssignment.fulfilled, (state, action) => {
        const { taskId, assignmentId } = action.payload;
        const list = state.assignmentsByTask[taskId];
        if (list) {
          state.assignmentsByTask[taskId] = list.filter((a) => a._id !== assignmentId);
        }
        state.successMessage = 'Assignee removed';
      });
  },
});

export const {
  clearTaskError,
  clearTaskSuccess,
  clearSelectedTask,
  setSelectedTask,
  optimisticMoveTask,
} = taskSlice.actions;

export default taskSlice.reducer;
