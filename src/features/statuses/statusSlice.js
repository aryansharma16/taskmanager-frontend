import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// ============================================================================
// Statuses are workspace-scoped Kanban columns.
// Mount path: /api/workspaces/:id/statuses
// All thunks below take `workspaceId` as the first arg and operate against
// that workspace's bucket in the slice — switching workspaces shouldn't
// flash stale data from another tenant.
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

// Pull a structured payload off an axios error so the caller can branch on
// the backend's reassignment-blocked path without re-parsing strings.
const errorPayload = (error, fallback) => ({
  message: handleError(error, fallback),
  status: error.response?.status,
  data: error.response?.data,
});

// GET /workspaces/:id/statuses?withTaskCounts=...
export const fetchStatuses = createAsyncThunk(
  'statuses/fetchStatuses',
  async ({ workspaceId, withTaskCounts = true } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/statuses`,
        { params: { withTaskCounts } }
      );
      return { workspaceId, items: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to load statuses'));
    }
  }
);

// GET /workspaces/:id/statuses/:statusId — single status + active task count
export const fetchStatusById = createAsyncThunk(
  'statuses/fetchStatusById',
  async ({ workspaceId, statusId }, { rejectWithValue }) => {
    try {
      const response = await api.get(
        `/workspaces/${workspaceId}/statuses/${statusId}`
      );
      return { workspaceId, status: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to load status'));
    }
  }
);

// POST /workspaces/:id/statuses — body: { name, color? }
export const createStatus = createAsyncThunk(
  'statuses/createStatus',
  async ({ workspaceId, data }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        `/workspaces/${workspaceId}/statuses`,
        data
      );
      return { workspaceId, status: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to create status'));
    }
  }
);

// PUT /workspaces/:id/statuses/:statusId — body: { name?, color? }
export const updateStatus = createAsyncThunk(
  'statuses/updateStatus',
  async ({ workspaceId, statusId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/workspaces/${workspaceId}/statuses/${statusId}`,
        data
      );
      return { workspaceId, status: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to update status'));
    }
  }
);

// PUT /workspaces/:id/statuses/reorder
// Body: { orderedIds: [statusId, statusId, ...] }
// Server enforces that the array references every status in the workspace
// exactly once; the response is the freshly-sorted list (with `order`
// rewritten to 0..n-1) so we can replace the local bucket atomically and
// avoid a follow-up GET.
export const reorderStatuses = createAsyncThunk(
  'statuses/reorderStatuses',
  async ({ workspaceId, orderedIds }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/workspaces/${workspaceId}/statuses/reorder`,
        { orderedIds }
      );
      return { workspaceId, items: response.data.data };
    } catch (error) {
      return rejectWithValue(handleError(error, 'Failed to reorder statuses'));
    }
  }
);

// DELETE /workspaces/:id/statuses/:statusId
// `reassignTo` must be either a sibling status id or the literal string
// 'null' (per the API spec) to bulk-clear referencing tasks.
// We pass it as a query param so the request body stays empty — DELETE
// bodies are flaky across proxies.
export const deleteStatus = createAsyncThunk(
  'statuses/deleteStatus',
  async (
    { workspaceId, statusId, reassignTo },
    { rejectWithValue }
  ) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/statuses/${statusId}`, {
        params: reassignTo !== undefined ? { reassignTo } : undefined,
      });
      return { workspaceId, statusId };
    } catch (error) {
      // Surface the full payload so the page can detect "blocked due to
      // active tasks" vs. a generic failure and prompt for reassignTo.
      return rejectWithValue(errorPayload(error, 'Failed to delete status'));
    }
  }
);

// ----------------------------------------------------------------------------
// Slice
// ----------------------------------------------------------------------------

// Statuses are bucketed by workspace so we don't leak a previous workspace's
// list into the current view while a fetch is in flight.
const initialState = {
  byWorkspace: {}, // { [workspaceId]: { items: [], loaded: false } }
  loading: false,
  mutating: false,
  error: null,
  successMessage: null,
};

const ensureBucket = (state, workspaceId) => {
  if (!state.byWorkspace[workspaceId]) {
    state.byWorkspace[workspaceId] = { items: [], loaded: false };
  }
  return state.byWorkspace[workspaceId];
};

// Server invariant: list endpoints come back sorted by (order ASC, name ASC).
// We mirror it locally so optimistic inserts after create / update don't drift.
const STATUS_SORT = (a, b) => {
  const ao = Number.isFinite(a?.order) ? a.order : Number.MAX_SAFE_INTEGER;
  const bo = Number.isFinite(b?.order) ? b.order : Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return (a?.name || '').localeCompare(b?.name || '', undefined, {
    sensitivity: 'base',
  });
};

const statusSlice = createSlice({
  name: 'statuses',
  initialState,
  reducers: {
    clearStatusError: (state) => {
      state.error = null;
    },
    clearStatusSuccess: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- List ----
      .addCase(fetchStatuses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatuses.fulfilled, (state, action) => {
        state.loading = false;
        const { workspaceId, items } = action.payload;
        const bucket = ensureBucket(state, workspaceId);
        // Server already sorts by (order ASC, name ASC); we re-sort defensively
        // so the local invariant matches even if a future endpoint forgets.
        bucket.items = Array.isArray(items) ? [...items].sort(STATUS_SORT) : [];
        bucket.loaded = true;
      })
      .addCase(fetchStatuses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // ---- Single ----
      .addCase(fetchStatusById.fulfilled, (state, action) => {
        const { workspaceId, status } = action.payload;
        if (!status) return;
        const bucket = ensureBucket(state, workspaceId);
        const idx = bucket.items.findIndex((s) => s._id === status._id);
        if (idx === -1) {
          bucket.items.push(status);
        } else {
          bucket.items[idx] = { ...bucket.items[idx], ...status };
        }
      })
      // ---- Create ----
      .addCase(createStatus.pending, (state) => {
        state.mutating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(createStatus.fulfilled, (state, action) => {
        state.mutating = false;
        const { workspaceId, status } = action.payload;
        if (!status) return;
        const bucket = ensureBucket(state, workspaceId);
        bucket.items.push(status);
        bucket.items.sort(STATUS_SORT);
        state.successMessage = 'Status created';
      })
      .addCase(createStatus.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload;
      })
      // ---- Update ----
      .addCase(updateStatus.pending, (state) => {
        state.mutating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        state.mutating = false;
        const { workspaceId, status } = action.payload;
        if (!status) return;
        const bucket = ensureBucket(state, workspaceId);
        const idx = bucket.items.findIndex((s) => s._id === status._id);
        if (idx !== -1) {
          // Preserve any taskCount the list view was carrying — the update
          // endpoint doesn't recompute it.
          bucket.items[idx] = {
            ...bucket.items[idx],
            ...status,
          };
        } else {
          bucket.items.push(status);
        }
        bucket.items.sort(STATUS_SORT);
        state.successMessage = 'Status updated';
      })
      .addCase(updateStatus.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload;
      })
      // ---- Reorder ----
      // The server returns the freshly-sorted list with `order` rewritten to
      // 0..n-1 across the workspace, so we replace the bucket wholesale —
      // never patch in place. taskCount on each row is preserved across the
      // payload because the controller recomputes it for the response.
      .addCase(reorderStatuses.pending, (state, action) => {
        state.mutating = true;
        state.error = null;
        state.successMessage = null;
        // Optimistic update: rewrite the local bucket in the requested order
        // immediately so the board doesn't snap back during the round-trip.
        const { workspaceId, orderedIds } = action.meta.arg || {};
        const bucket = state.byWorkspace[workspaceId];
        if (!bucket || !Array.isArray(orderedIds)) return;
        const byId = new Map(bucket.items.map((s) => [s._id, s]));
        const reordered = orderedIds
          .map((id, i) => {
            const existing = byId.get(id);
            return existing ? { ...existing, order: i } : null;
          })
          .filter(Boolean);
        // If the array references unknown ids (stale FE), keep the original
        // bucket — the server will reject anyway and the rejection handler
        // refetches.
        if (reordered.length === bucket.items.length) {
          bucket.items = reordered;
        }
      })
      .addCase(reorderStatuses.fulfilled, (state, action) => {
        state.mutating = false;
        const { workspaceId, items } = action.payload;
        const bucket = ensureBucket(state, workspaceId);
        bucket.items = Array.isArray(items) ? items : bucket.items;
        bucket.loaded = true;
        state.successMessage = 'Pipeline reordered';
      })
      .addCase(reorderStatuses.rejected, (state, action) => {
        state.mutating = false;
        state.error = action.payload;
        // The optimistic update is left in place; the caller is expected to
        // re-fetch on failure (handled in the page component).
      })
      // ---- Delete ----
      .addCase(deleteStatus.pending, (state) => {
        state.mutating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(deleteStatus.fulfilled, (state, action) => {
        state.mutating = false;
        const { workspaceId, statusId } = action.payload;
        const bucket = state.byWorkspace[workspaceId];
        if (bucket) {
          bucket.items = bucket.items.filter((s) => s._id !== statusId);
        }
        state.successMessage = 'Status deleted';
      })
      .addCase(deleteStatus.rejected, (state, action) => {
        state.mutating = false;
        // The payload here is an object ({ message, status, data }); store
        // only the human-facing message on the global error so the toast is
        // sensible. The component can introspect the rejection via .unwrap().
        state.error = action.payload?.message || action.payload || 'Failed to delete status';
      });
  },
});

export const { clearStatusError, clearStatusSuccess } = statusSlice.actions;

// ----------------------------------------------------------------------------
// Selectors
// ----------------------------------------------------------------------------

const EMPTY_LIST = [];

export const selectStatusesForWorkspace = (state, workspaceId) =>
  state.statuses.byWorkspace[workspaceId]?.items || EMPTY_LIST;

export const selectStatusesLoaded = (state, workspaceId) =>
  Boolean(state.statuses.byWorkspace[workspaceId]?.loaded);

export default statusSlice.reducer;
