import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// Backend route prefix is /api/workspaces.
// Standard envelope: { success, data, message? }

// GET /workspaces — list workspaces (paginated)
export const fetchWorkspaces = createAsyncThunk(
  'workspaces/fetchWorkspaces',
  async ({ page = 1, limit = 20, includeArchived = false } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/workspaces', {
        params: { page, limit, includeArchived },
      });
      return response.data.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to fetch workspaces');
      }
      return rejectWithValue(error.message);
    }
  }
);

// GET /workspaces/:id — single workspace + memberCount
export const fetchWorkspaceById = createAsyncThunk(
  'workspaces/fetchWorkspaceById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/workspaces/${id}`);
      return response.data.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to fetch workspace');
      }
      return rejectWithValue(error.message);
    }
  }
);

// POST /workspaces — create
export const createWorkspace = createAsyncThunk(
  'workspaces/createWorkspace',
  async (workspaceData, { rejectWithValue }) => {
    try {
      const response = await api.post('/workspaces', workspaceData);
      return response.data.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to create workspace');
      }
      return rejectWithValue(error.message);
    }
  }
);

// PUT /workspaces/:id — update
export const updateWorkspace = createAsyncThunk(
  'workspaces/updateWorkspace',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/workspaces/${id}`, data);
      return response.data.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to update workspace');
      }
      return rejectWithValue(error.message);
    }
  }
);

// DELETE /workspaces/:id — archive (soft delete)
export const archiveWorkspace = createAsyncThunk(
  'workspaces/archiveWorkspace',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/workspaces/${id}`);
      return { id, data: response.data.data };
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to archive workspace');
      }
      return rejectWithValue(error.message);
    }
  }
);

// PATCH /workspaces/:id/restore — un-archive
export const restoreWorkspace = createAsyncThunk(
  'workspaces/restoreWorkspace',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/workspaces/${id}/restore`);
      return response.data.data;
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to restore workspace');
      }
      return rejectWithValue(error.message);
    }
  }
);

// GET /workspaces/:id/members
export const fetchWorkspaceMembers = createAsyncThunk(
  'workspaces/fetchMembers',
  async ({ id, status, page = 1, limit = 50 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/workspaces/${id}/members`, {
        params: { status, page, limit },
      });
      return { workspaceId: id, ...response.data.data };
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to fetch workspace members');
      }
      return rejectWithValue(error.message);
    }
  }
);

// POST /workspaces/:id/members
export const addWorkspaceMember = createAsyncThunk(
  'workspaces/addMember',
  async ({ id, userId, roleId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/workspaces/${id}/members`, { userId, roleId });
      return { workspaceId: id, member: response.data.data };
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to add member');
      }
      return rejectWithValue(error.message);
    }
  }
);

// PUT /workspaces/:id/members/:memberId
export const updateWorkspaceMemberRole = createAsyncThunk(
  'workspaces/updateMemberRole',
  async ({ id, memberId, roleId }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/workspaces/${id}/members/${memberId}`, { roleId });
      return { workspaceId: id, member: response.data.data };
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to update member role');
      }
      return rejectWithValue(error.message);
    }
  }
);

// DELETE /workspaces/:id/members/:memberId
export const removeWorkspaceMember = createAsyncThunk(
  'workspaces/removeMember',
  async ({ id, memberId }, { rejectWithValue }) => {
    try {
      await api.delete(`/workspaces/${id}/members/${memberId}`);
      return { workspaceId: id, memberId };
    } catch (error) {
      if (error.response && error.response.data) {
        return rejectWithValue(error.response.data.error || error.response.data.message || 'Failed to remove member');
      }
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  items: [],
  page: 1,
  limit: 20,
  total: 0,
  selectedWorkspace: null,
  membersByWorkspace: {}, // { [workspaceId]: { items, page, limit, total } }
  loading: false,
  memberFailures: [], // populated after a create call that had partial member failures
  error: null,
  successMessage: null,
};

const workspaceSlice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    clearWorkspaceError: (state) => {
      state.error = null;
    },
    clearWorkspaceSuccess: (state) => {
      state.successMessage = null;
    },
    clearMemberFailures: (state) => {
      state.memberFailures = [];
    },
    clearSelectedWorkspace: (state) => {
      state.selectedWorkspace = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // List
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.items || [];
        state.page = action.payload?.page ?? 1;
        state.limit = action.payload?.limit ?? 20;
        state.total = action.payload?.total ?? state.items.length;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get by id
      .addCase(fetchWorkspaceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaceById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedWorkspace = action.payload;
      })
      .addCase(fetchWorkspaceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
        state.memberFailures = [];
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        const { workspace, memberFailures } = action.payload || {};
        if (workspace) state.items.unshift(workspace);
        state.memberFailures = memberFailures || [];
        state.successMessage = memberFailures?.length
          ? `Workspace created. ${memberFailures.length} initial member(s) could not be added.`
          : 'Workspace created successfully';
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update
      .addCase(updateWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        if (updated) {
          const idx = state.items.findIndex((w) => w._id === updated._id);
          if (idx !== -1) state.items[idx] = updated;
        }
        state.successMessage = 'Workspace updated successfully';
      })
      .addCase(updateWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Archive
      .addCase(archiveWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(archiveWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload?.id;
        const idx = state.items.findIndex((w) => w._id === id);
        if (idx !== -1) {
          state.items[idx] = {
            ...state.items[idx],
            isActive: false,
            archivedAt: new Date().toISOString(),
          };
        }
        state.successMessage = 'Workspace archived';
      })
      .addCase(archiveWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Restore
      .addCase(restoreWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(restoreWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        if (updated) {
          const idx = state.items.findIndex((w) => w._id === updated._id);
          if (idx !== -1) state.items[idx] = updated;
        }
        state.successMessage = 'Workspace restored';
      })
      .addCase(restoreWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Members
      .addCase(fetchWorkspaceMembers.fulfilled, (state, action) => {
        const { workspaceId, items, page, limit, total } = action.payload;
        state.membersByWorkspace[workspaceId] = { items: items || [], page, limit, total };
      })
      .addCase(addWorkspaceMember.fulfilled, (state, action) => {
        const { workspaceId, member } = action.payload;
        if (!state.membersByWorkspace[workspaceId]) {
          state.membersByWorkspace[workspaceId] = { items: [member], page: 1, limit: 50, total: 1 };
        } else {
          state.membersByWorkspace[workspaceId].items.push(member);
          state.membersByWorkspace[workspaceId].total += 1;
        }
        state.successMessage = 'Member added to workspace';
      })
      .addCase(addWorkspaceMember.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateWorkspaceMemberRole.fulfilled, (state, action) => {
        const { workspaceId, member } = action.payload;
        const list = state.membersByWorkspace[workspaceId];
        if (list) {
          const idx = list.items.findIndex((m) => m._id === member._id);
          if (idx !== -1) list.items[idx] = member;
        }
        state.successMessage = 'Member role updated';
      })
      .addCase(updateWorkspaceMemberRole.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(removeWorkspaceMember.fulfilled, (state, action) => {
        const { workspaceId, memberId } = action.payload;
        const list = state.membersByWorkspace[workspaceId];
        if (list) {
          list.items = list.items.filter((m) => m._id !== memberId);
          list.total = Math.max(0, list.total - 1);
        }
        state.successMessage = 'Member removed from workspace';
      })
      .addCase(removeWorkspaceMember.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  clearWorkspaceError,
  clearWorkspaceSuccess,
  clearMemberFailures,
  clearSelectedWorkspace,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
