import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWorkspaces,
  createWorkspace,
  updateWorkspace,
  archiveWorkspace,
  restoreWorkspace,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  clearWorkspaceError,
  clearWorkspaceSuccess,
  clearMemberFailures,
} from '../../features/workspaces/workspaceSlice';
import { fetchRoles } from '../../features/roles/roleSlice';
import { fetchUsers } from '../../features/users/userSlice';
import DynamicMessagePopUp from '../../components/DynamicMessagePopUp';

const INITIAL_POPUP = {
  isOpen: false,
  variant: 'info',
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  hideCancel: false,
  onConfirm: null,
};

const WORKSPACE_GRADIENTS = [
  'from-violet-500 to-fuchsia-600',
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-rose-500',
];

const hashString = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const slugify = (str = '') =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const formatDate = (iso) => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const getInitials = (name = '') => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase().slice(0, 2);
};

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  creatorRoleId: '',
  initialMembers: [], // Array<{ userId, roleId }>
};

const WorkspaceManagement = () => {
  const dispatch = useDispatch();
  const {
    items: workspaces,
    loading,
    error,
    successMessage,
    memberFailures,
    membersByWorkspace,
  } = useSelector((state) => state.workspaces);
  const { roles } = useSelector((state) => state.roles);
  const { users: orgMembers } = useSelector((state) => state.users);
  const currentUser = useSelector((state) => state.auth?.user);

  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState('');

  // Inline "add member" row for edit mode
  const [newMember, setNewMember] = useState({ userId: '', roleId: '' });

  const [popup, setPopup] = useState(INITIAL_POPUP);
  const closePopup = () => setPopup((p) => ({ ...p, isOpen: false }));

  // Initial load
  useEffect(() => {
    dispatch(fetchWorkspaces({ includeArchived }));
    dispatch(fetchRoles());
    dispatch(fetchUsers());
  }, [dispatch, includeArchived]);

  // Pre-fetch members for every visible workspace so cards can show avatars + count.
  // We deliberately do NOT depend on membersByWorkspace to avoid refetch loops; the
  // mutating reducers (add/update/remove) keep the cached lists consistent.
  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    workspaces.forEach((w) => {
      if (!w?._id) return;
      if (!membersByWorkspace?.[w._id]) {
        dispatch(fetchWorkspaceMembers({ id: w._id, limit: 50 }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, dispatch]);

  // Refresh helpers — called after every mutation to keep server as source-of-truth
  const refreshWorkspaces = () => dispatch(fetchWorkspaces({ includeArchived }));
  const refreshMembers = (workspaceId) =>
    workspaceId && dispatch(fetchWorkspaceMembers({ id: workspaceId }));

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        dispatch(clearWorkspaceSuccess());
        dispatch(clearWorkspaceError());
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage, error, dispatch]);

  // Workspace-scoped roles only
  const workspaceRoles = useMemo(
    () => roles.filter((r) => r.scope === 'WORKSPACE'),
    [roles]
  );

  // Active org members; userId for each = membership.user._id
  const memberPickerOptions = useMemo(() => {
    return (orgMembers || [])
      .map((m) => m.user)
      .filter(Boolean)
      .filter((u) => u._id && u._id !== currentUser?._id);
  }, [orgMembers, currentUser]);

  const filteredWorkspaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter(
      (w) =>
        w.name?.toLowerCase().includes(q) ||
        w.slug?.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q)
    );
  }, [workspaces, search]);

  const stats = useMemo(() => {
    const total = workspaces.length;
    const archived = workspaces.filter((w) => !w.isActive).length;
    return {
      total,
      active: total - archived,
      archived,
      roles: workspaceRoles.length,
    };
  }, [workspaces, workspaceRoles]);

  // ---------- Panel handlers ----------
  const openCreatePanel = () => {
    setEditingWorkspace(null);
    setActiveTab('details');
    setFormData({
      ...EMPTY_FORM,
      creatorRoleId: workspaceRoles[0]?._id ?? '',
      initialMembers: [],
    });
    setSlugTouched(false);
    setFormError('');
    dispatch(clearMemberFailures());
    setIsPanelOpen(true);
  };

  const openEditPanel = (workspace, tab = 'details') => {
    setEditingWorkspace(workspace);
    setActiveTab(tab);
    setFormData({
      name: workspace.name || '',
      slug: workspace.slug || '',
      description: workspace.description || '',
      creatorRoleId: '',
      initialMembers: [],
    });
    setSlugTouched(true); // Keep their existing slug as-is
    setFormError('');
    setNewMember({ userId: '', roleId: '' });
    setIsPanelOpen(true);
    dispatch(fetchWorkspaceMembers({ id: workspace._id }));
  };

  const openMembersPanel = (workspace) => openEditPanel(workspace, 'members');

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => {
      setEditingWorkspace(null);
      setActiveTab('details');
      setFormData(EMPTY_FORM);
      setSlugTouched(false);
      setFormError('');
      setNewMember({ userId: '', roleId: '' });
    }, 300);
  };

  // Current edit-mode members from the slice
  const currentMembers = useMemo(() => {
    if (!editingWorkspace) return [];
    return membersByWorkspace?.[editingWorkspace._id]?.items || [];
  }, [editingWorkspace, membersByWorkspace]);

  const currentMemberUserIds = useMemo(
    () => new Set(currentMembers.map((m) => m.user?._id).filter(Boolean)),
    [currentMembers]
  );

  // Org users that aren't already in this workspace — for the "add member" picker
  const availableUsersForEdit = useMemo(() => {
    return (orgMembers || [])
      .map((m) => m.user)
      .filter(Boolean)
      .filter((u) => u._id && !currentMemberUserIds.has(u._id));
  }, [orgMembers, currentMemberUserIds]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugify(name),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }));
  };

  const handleField = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // ---------- Initial member rows ----------
  const addMemberRow = () => {
    setFormData((prev) => ({
      ...prev,
      initialMembers: [
        ...prev.initialMembers,
        { userId: '', roleId: prev.creatorRoleId || workspaceRoles[0]?._id || '' },
      ],
    }));
  };

  const updateMemberRow = (index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      initialMembers: prev.initialMembers.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      ),
    }));
  };

  const removeMemberRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      initialMembers: prev.initialMembers.filter((_, i) => i !== index),
    }));
  };

  // Users already chosen in another row should be disabled in pickers
  const usedUserIds = useMemo(
    () => new Set(formData.initialMembers.map((m) => m.userId).filter(Boolean)),
    [formData.initialMembers]
  );

  // ---------- Submit ----------
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Workspace name is required.');
      return;
    }

    // Update flow
    if (editingWorkspace) {
      const data = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim(),
      };
      dispatch(updateWorkspace({ id: editingWorkspace._id, data }))
        .unwrap()
        .then((updated) => {
          if (updated) setEditingWorkspace(updated);
          refreshWorkspaces();
        })
        .catch(() => {});
      return;
    }

    // Create flow
    if (!formData.creatorRoleId) {
      setFormError('Please pick a creator role.');
      return;
    }

    const cleanInitialMembers = formData.initialMembers
      .filter((m) => m.userId && m.roleId)
      .map((m) => ({ userId: m.userId, roleId: m.roleId }));

    const incompleteRow = formData.initialMembers.find((m) => !m.userId || !m.roleId);
    if (incompleteRow) {
      setFormError('Each initial member needs both a user and a role.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      description: formData.description.trim() || undefined,
      creatorRoleId: formData.creatorRoleId,
      initialMembers: cleanInitialMembers.length ? cleanInitialMembers : undefined,
    };

    dispatch(createWorkspace(payload))
      .unwrap()
      .then(() => {
        closePanel();
        refreshWorkspaces();
      })
      .catch(() => {
        // error already lives on state.workspaces.error; the panel stays open
      });
  };

  // ---------- Edit-mode member actions ----------
  const handleChangeMemberRole = (member, nextRoleId) => {
    if (!editingWorkspace || !nextRoleId) return;
    const currentRoleId = typeof member.role === 'object' ? member.role._id : member.role;
    if (currentRoleId === nextRoleId) return;

    const nextRole = workspaceRoles.find((r) => r._id === nextRoleId);
    setPopup({
      isOpen: true,
      variant: 'warning',
      title: 'Change member role?',
      message: (
        <>
          <span className="font-semibold text-on-surface">{member.user?.name}</span>{' '}
          will be reassigned to{' '}
          <span className="font-semibold text-on-surface">
            {nextRole?.name || 'the selected role'}
          </span>{' '}
          in <span className="font-semibold text-on-surface">{editingWorkspace.name}</span>.
        </>
      ),
      confirmLabel: 'Update Role',
      onConfirm: () => {
        const wsId = editingWorkspace._id;
        dispatch(
          updateWorkspaceMemberRole({
            id: wsId,
            memberId: member._id,
            roleId: nextRoleId,
          })
        )
          .unwrap()
          .then(() => {
            closePopup();
            refreshMembers(wsId);
          })
          .catch(() => closePopup());
      },
    });
  };

  const handleRemoveMember = (member) => {
    if (!editingWorkspace) return;
    const isSelf = member.user?._id === currentUser?._id;
    setPopup({
      isOpen: true,
      variant: 'danger',
      title: isSelf ? 'Leave this workspace?' : 'Remove this member?',
      message: isSelf ? (
        <>
          You are about to remove yourself from{' '}
          <span className="font-semibold text-on-surface">{editingWorkspace.name}</span>.
          You'll lose access to its content immediately.
        </>
      ) : (
        <>
          <span className="font-semibold text-on-surface">{member.user?.name}</span> will lose
          access to <span className="font-semibold text-on-surface">{editingWorkspace.name}</span>.
          This cannot be undone.
        </>
      ),
      confirmLabel: isSelf ? 'Leave Workspace' : 'Remove Member',
      onConfirm: () => {
        const wsId = editingWorkspace._id;
        dispatch(
          removeWorkspaceMember({ id: wsId, memberId: member._id })
        )
          .unwrap()
          .then(() => {
            closePopup();
            refreshMembers(wsId);
            // If the user removed themselves, the server may now omit this
            // workspace from the visible list; refetch to stay in sync.
            if (isSelf) refreshWorkspaces();
          })
          .catch(() => closePopup());
      },
    });
  };

  const handleAddNewMember = () => {
    if (!editingWorkspace || !newMember.userId || !newMember.roleId) return;
    const wsId = editingWorkspace._id;
    dispatch(
      addWorkspaceMember({
        id: wsId,
        userId: newMember.userId,
        roleId: newMember.roleId,
      })
    )
      .unwrap()
      .then(() => {
        setNewMember({ userId: '', roleId: '' });
        refreshMembers(wsId);
      })
      .catch(() => {});
  };

  // ---------- Archive / Restore ----------
  const handleArchive = (workspace) => {
    setPopup({
      isOpen: true,
      variant: 'danger',
      title: 'Archive this workspace?',
      message: (
        <>
          <span className="font-semibold text-on-surface">{workspace.name}</span> will be
          archived. Members will lose access until you restore it. The workspace and its
          history are preserved.
        </>
      ),
      confirmLabel: 'Archive',
      cancelLabel: 'Cancel',
      hideCancel: false,
      onConfirm: () => {
        dispatch(archiveWorkspace(workspace._id))
          .unwrap()
          .then(() => {
            closePopup();
            refreshWorkspaces();
          })
          .catch(() => closePopup());
      },
    });
  };

  const handleRestore = (workspace) => {
    setPopup({
      isOpen: true,
      variant: 'info',
      title: 'Restore this workspace?',
      message: (
        <>
          <span className="font-semibold text-on-surface">{workspace.name}</span> will be
          re-activated and its members will regain access immediately.
        </>
      ),
      confirmLabel: 'Restore',
      cancelLabel: 'Cancel',
      hideCancel: false,
      onConfirm: () => {
        dispatch(restoreWorkspace(workspace._id))
          .unwrap()
          .then(() => {
            closePopup();
            refreshWorkspaces();
          })
          .catch(() => closePopup());
      },
    });
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6 animate-fade-in relative h-full">
      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          {error}
          <button onClick={() => dispatch(clearWorkspaceError())}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-secondary-container text-on-secondary-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          {successMessage}
          <button onClick={() => dispatch(clearWorkspaceSuccess())}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
      {memberFailures.length > 0 && (
        <div className="bg-tertiary-container/30 dark:bg-tertiary/15 text-on-surface border border-tertiary-container/40 dark:border-tertiary/30 p-4 rounded-lg text-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-tertiary">warning</span>
              Some initial members couldn't be added
            </p>
            <button onClick={() => dispatch(clearMemberFailures())}>
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <ul className="list-disc pl-6 space-y-0.5 text-on-surface-variant">
            {memberFailures.map((f, i) => (
              <li key={`${f.userId}-${i}`} className="text-xs">
                <span className="font-mono">{f.userId}</span> — {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Manrope'] dark:font-['Space_Grotesk'] text-[28px] font-bold dark:font-semibold text-on-surface tracking-tight">
            Workspaces
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Spin up a workspace for each team or project and bring members along.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest dark:bg-background border border-outline-variant/40 rounded-lg text-sm text-on-surface cursor-pointer">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-outline-variant/60 text-primary focus:ring-primary"
            />
            Show archived
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workspaces..."
              className="pl-10 pr-4 py-2 bg-surface-container-lowest dark:bg-background border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 dark:focus:border-primary outline-none transition-all"
            />
          </div>
          <button
            onClick={openCreatePanel}
            className="flex items-center gap-2 px-4 py-2 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            New Workspace
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: 'workspaces', tone: 'primary' },
          { label: 'Active', value: stats.active, icon: 'check_circle', tone: 'secondary' },
          { label: 'Archived', value: stats.archived, icon: 'archive', tone: 'tertiary' },
          { label: 'Workspace Roles', value: stats.roles, icon: 'badge', tone: 'error' },
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
                  : stat.tone === 'tertiary'
                  ? 'bg-tertiary-container/30 text-tertiary-container dark:bg-tertiary/15 dark:text-tertiary'
                  : 'bg-error/10 text-error'
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

      {/* Workspace cards grid */}
      <div className="bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 p-4 sm:p-6 relative min-h-[200px]">
        {loading && workspaces.length === 0 && (
          <div className="absolute inset-0 bg-surface-container-lowest/50 dark:bg-background/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
              refresh
            </span>
          </div>
        )}

        {filteredWorkspaces.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary-container/15 dark:bg-primary/15 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px] text-primary">workspaces</span>
            </div>
            <p className="text-on-surface font-semibold mb-1">
              {search ? `No workspaces match "${search}"` : 'No workspaces yet'}
            </p>
            <p className="text-sm text-on-surface-variant mb-4">
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Create your first workspace to start organising teams and projects.'}
            </p>
            {!search && (
              <button
                onClick={openCreatePanel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                Create Workspace
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkspaces.map((w) => {
              const gradient =
                WORKSPACE_GRADIENTS[hashString(w._id || w.slug || w.name) % WORKSPACE_GRADIENTS.length];
              const archived = !w.isActive;
              const creator = typeof w.createdBy === 'object' ? w.createdBy : null;
              const memberBucket = membersByWorkspace?.[w._id];
              const wsMembers = memberBucket?.items || [];
              const wsMemberCount = memberBucket?.total ?? wsMembers.length;
              const visibleMembers = wsMembers.slice(0, 4);

              return (
                <div
                  key={w._id}
                  className={`relative group bg-surface dark:bg-surface-container-low/50 rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 overflow-hidden hover:shadow-lg transition-all ${
                    archived ? 'opacity-70' : ''
                  }`}
                >
                  <div className={`h-20 bg-gradient-to-br ${gradient} relative`}>
                    {archived && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-on-background/40 text-white backdrop-blur-sm uppercase">
                        <span className="material-symbols-outlined text-[12px]">archive</span>
                        Archived
                      </span>
                    )}
                    <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-xl bg-surface dark:bg-surface-container-low border-4 border-surface dark:border-surface-container-low flex items-center justify-center text-on-surface font-bold text-sm shadow-md">
                      {getInitials(w.name)}
                    </div>
                  </div>

                  <div className="px-4 pt-8 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-on-surface truncate">{w.name}</h3>
                        <p className="text-[11px] font-mono text-on-surface-variant truncate">
                          /{w.slug}
                        </p>
                      </div>
                    </div>

                    <p
                      className="text-xs text-on-surface-variant mt-2 leading-relaxed line-clamp-2 min-h-[32px]"
                      title={w.description}
                    >
                      {w.description || (
                        <span className="italic text-outline">No description</span>
                      )}
                    </p>

                    {/* Members preview */}
                    <button
                      type="button"
                      onClick={() => !archived && openMembersPanel(w)}
                      disabled={archived}
                      className={`mt-3 w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-transparent text-left transition-colors ${
                        archived
                          ? 'cursor-not-allowed'
                          : 'hover:border-outline-variant/40 hover:bg-surface-container-low/50 dark:hover:bg-surface-container-highest/30'
                      }`}
                      title={archived ? 'Restore to manage members' : 'Manage members'}
                    >
                      <div className="flex items-center min-w-0">
                        {visibleMembers.length > 0 ? (
                          <div className="flex -space-x-2">
                            {visibleMembers.map((m) => {
                              const u = m.user || {};
                              const avatarGradient =
                                WORKSPACE_GRADIENTS[
                                  hashString(u._id || u.email || '') % WORKSPACE_GRADIENTS.length
                                ];
                              return (
                                <div
                                  key={m._id}
                                  className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGradient} border-2 border-surface dark:border-surface-container-low flex items-center justify-center text-white text-[9px] font-bold`}
                                  title={`${u.name || ''}${
                                    m.role && typeof m.role === 'object'
                                      ? ` · ${m.role.name}`
                                      : ''
                                  }`}
                                >
                                  {getInitials(u.name)}
                                </div>
                              );
                            })}
                            {wsMemberCount > visibleMembers.length && (
                              <div className="w-6 h-6 rounded-full bg-surface-container-highest dark:bg-surface-container-low border-2 border-surface dark:border-surface-container-low flex items-center justify-center text-on-surface-variant text-[9px] font-bold">
                                +{wsMemberCount - visibleMembers.length}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            group
                          </span>
                        )}
                        <span className="ml-2 text-[11px] font-medium text-on-surface-variant truncate">
                          {wsMemberCount === 0
                            ? 'No members yet'
                            : `${wsMemberCount} ${wsMemberCount === 1 ? 'member' : 'members'}`}
                        </span>
                      </div>
                      {!archived && (
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0">
                          arrow_forward
                        </span>
                      )}
                    </button>

                    <div className="mt-3 pt-3 border-t border-outline-variant/30 dark:border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
                      <span className="flex items-center gap-1.5 truncate" title={creator?.email || ''}>
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        <span className="truncate">{creator?.name || 'Unknown'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {formatDate(w.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!archived && (
                      <>
                        <button
                          onClick={() => openEditPanel(w)}
                          className="p-1.5 rounded-md bg-on-background/40 text-white backdrop-blur-sm hover:bg-on-background/60 transition-colors"
                          title="Edit workspace"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => openMembersPanel(w)}
                          className="p-1.5 rounded-md bg-on-background/40 text-white backdrop-blur-sm hover:bg-on-background/60 transition-colors"
                          title="Manage members"
                        >
                          <span className="material-symbols-outlined text-[16px]">group</span>
                        </button>
                      </>
                    )}
                    {archived ? (
                      <button
                        onClick={() => handleRestore(w)}
                        className="p-1.5 rounded-md bg-on-background/40 text-white backdrop-blur-sm hover:bg-on-background/60 transition-colors"
                        title="Restore workspace"
                      >
                        <span className="material-symbols-outlined text-[16px]">unarchive</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(w)}
                        className="p-1.5 rounded-md bg-on-background/40 text-white backdrop-blur-sm hover:bg-on-background/60 transition-colors"
                        title="Archive workspace"
                      >
                        <span className="material-symbols-outlined text-[16px]">archive</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isPanelOpen && (
        <div
          className="fixed top-0 left-0 w-screen h-screen bg-on-background/20 dark:bg-background/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={closePanel}
        />
      )}

      {/* Create / Edit slide-over */}
      <div
        className={`fixed top-0 right-0 h-screen w-full max-w-xl bg-surface-container-lowest dark:bg-[#0b1326] shadow-2xl z-50 border-l border-outline-variant/30 dark:border-outline-variant/20 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 dark:border-outline-variant/20">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-on-surface truncate">
              {editingWorkspace ? `Edit · ${editingWorkspace.name}` : 'Create Workspace'}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {editingWorkspace
                ? 'Update workspace details and manage members.'
                : "You'll be added automatically with the creator role."}
            </p>
          </div>
          <button
            onClick={closePanel}
            className="p-2 text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest rounded-full transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs (edit mode only) */}
        {editingWorkspace && (
          <div className="flex border-b border-outline-variant/30 dark:border-outline-variant/20 px-3">
            {[
              { id: 'details', label: 'Details', icon: 'tune' },
              {
                id: 'members',
                label: `Members${currentMembers.length ? ` (${currentMembers.length})` : ''}`,
                icon: 'group',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-container dark:border-primary text-primary-container dark:text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* MEMBERS TAB (edit mode) */}
          {editingWorkspace && activeTab === 'members' && (
            <div className="space-y-5">
              {/* Add member row */}
              <div className="bg-surface-container-low/40 dark:bg-surface-container-highest/30 border border-outline-variant/40 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
                  Add a Member
                </p>
                <div className="grid grid-cols-[1fr_140px_36px] gap-2 items-start">
                  <select
                    value={newMember.userId}
                    onChange={(e) => setNewMember((p) => ({ ...p, userId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                  >
                    <option value="">Select a user…</option>
                    {availableUsersForEdit.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} · {u.email}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newMember.roleId}
                    onChange={(e) => setNewMember((p) => ({ ...p, roleId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                  >
                    <option value="">Role…</option>
                    {workspaceRoles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddNewMember}
                    disabled={!newMember.userId || !newMember.roleId || loading}
                    className="h-[42px] flex items-center justify-center bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg hover:brightness-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add member"
                  >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                  </button>
                </div>
                {availableUsersForEdit.length === 0 && (
                  <p className="text-[11px] text-on-surface-variant px-1">
                    Every active org member is already in this workspace.
                  </p>
                )}
              </div>

              {/* Existing members list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
                  Current Members
                </p>
                {currentMembers.length === 0 && (
                  <div className="px-4 py-6 text-center bg-surface-container-low/40 dark:bg-surface-container-highest/20 border border-dashed border-outline-variant/40 rounded-lg">
                    <p className="text-xs text-on-surface-variant">
                      No members in this workspace yet.
                    </p>
                  </div>
                )}
                {currentMembers.map((member) => {
                  const u = member.user || {};
                  const memberRoleId =
                    typeof member.role === 'object' ? member.role?._id : member.role;
                  const isSelf = u._id === currentUser?._id;
                  const gradient =
                    WORKSPACE_GRADIENTS[
                      hashString(u._id || u.email || '') % WORKSPACE_GRADIENTS.length
                    ];

                  return (
                    <div
                      key={member._id}
                      className="flex items-center gap-3 p-3 bg-surface dark:bg-surface-container-low/40 border border-outline-variant/30 rounded-lg"
                    >
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                      >
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-on-surface truncate flex items-center gap-2">
                          {u.name || '—'}
                          {isSelf && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-container/20 text-primary-container dark:bg-primary/20 dark:text-primary">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">{u.email}</p>
                      </div>
                      <select
                        value={memberRoleId || ''}
                        onChange={(e) => handleChangeMemberRole(member, e.target.value)}
                        className="w-[140px] px-2.5 py-2 bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                      >
                        {workspaceRoles.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name}
                          </option>
                        ))}
                        {/* If the current role isn't in the workspaceRoles list (e.g. global), still show it */}
                        {memberRoleId && !workspaceRoles.find((r) => r._id === memberRoleId) && (
                          <option value={memberRoleId}>
                            {(typeof member.role === 'object' && member.role?.name) ||
                              memberRoleId}
                          </option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                        title={isSelf ? 'Leave workspace' : 'Remove member'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isSelf ? 'logout' : 'person_remove'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETAILS TAB (default for both create + edit) */}
          {(!editingWorkspace || activeTab === 'details') && (
          <form id="workspace-form" onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="bg-error-container/40 text-on-error-container border border-error/30 rounded-lg px-3 py-2 text-sm">
                {formError}
              </div>
            )}

            {workspaceRoles.length === 0 && (
              <div className="bg-error-container/30 text-on-error-container border border-error/30 rounded-lg px-3 py-2 text-sm">
                No <span className="font-semibold">workspace-scoped</span> roles found. Create
                one in <span className="font-semibold">Role Management</span> with{' '}
                <span className="font-mono">scope = WORKSPACE</span> first.
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">
                Workspace Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                required
                maxLength={80}
                className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                placeholder="Engineering"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Slug</label>
              <div className="flex items-stretch border border-outline-variant/40 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-container/30 focus-within:border-primary-container">
                <span className="px-3 flex items-center bg-surface-container-low/60 dark:bg-surface-container-highest/30 text-xs font-mono text-on-surface-variant">
                  /workspaces/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  maxLength={60}
                  className="flex-1 px-3 py-2.5 bg-surface dark:bg-surface-container text-sm font-mono text-on-surface placeholder:text-outline outline-none"
                  placeholder="engineering"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Auto-generated from the name. Edit to override; lowercase letters, numbers and dashes only.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Description</label>
              <textarea
                value={formData.description}
                onChange={handleField('description')}
                rows={3}
                maxLength={500}
                className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none resize-none"
                placeholder="What is this workspace for?"
              />
            </div>

            {/* Creator role + Initial members — create mode only */}
            {!editingWorkspace && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">
                Your Role in this Workspace <span className="text-error">*</span>
              </label>
              <select
                value={formData.creatorRoleId}
                onChange={handleField('creatorRoleId')}
                required
                disabled={workspaceRoles.length === 0}
                className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none disabled:opacity-60"
              >
                <option value="" disabled>Select a role</option>
                {workspaceRoles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-on-surface-variant">
                You're automatically added as the first member with this role.
              </p>
            </div>
            )}

            {/* Initial members — create mode only */}
            {!editingWorkspace && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-on-surface">
                  Initial Members
                </label>
                <span className="text-[11px] text-on-surface-variant">
                  {formData.initialMembers.length} added
                </span>
              </div>

              {formData.initialMembers.length === 0 && (
                <div className="px-4 py-6 text-center bg-surface-container-low/40 dark:bg-surface-container-highest/20 border border-dashed border-outline-variant/40 rounded-lg">
                  <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
                    group_add
                  </span>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Add teammates and assign their roles for this workspace.
                  </p>
                </div>
              )}

              {formData.initialMembers.map((row, idx) => {
                const userObj = memberPickerOptions.find((u) => u._id === row.userId);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_140px_36px] gap-2 items-start"
                  >
                    <div>
                      <select
                        value={row.userId}
                        onChange={(e) => updateMemberRow(idx, 'userId', e.target.value)}
                        className="w-full px-3 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                      >
                        <option value="">Select a user…</option>
                        {memberPickerOptions.map((u) => (
                          <option
                            key={u._id}
                            value={u._id}
                            disabled={u._id !== row.userId && usedUserIds.has(u._id)}
                          >
                            {u.name} · {u.email}
                          </option>
                        ))}
                      </select>
                      {userObj && (
                        <p className="text-[10px] font-mono text-on-surface-variant mt-1 truncate">
                          {userObj.email}
                        </p>
                      )}
                    </div>
                    <select
                      value={row.roleId}
                      onChange={(e) => updateMemberRow(idx, 'roleId', e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                    >
                      <option value="">Role…</option>
                      {workspaceRoles.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeMemberRow(idx)}
                      className="h-[42px] flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addMemberRow}
                disabled={
                  workspaceRoles.length === 0 ||
                  memberPickerOptions.length === 0 ||
                  formData.initialMembers.length >= memberPickerOptions.length
                }
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-outline-variant/50 hover:border-primary/60 text-sm text-on-surface-variant hover:text-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Add member
              </button>

              {memberPickerOptions.length === 0 && (
                <p className="text-[11px] text-on-surface-variant">
                  No org members available to add. Invite teammates first in{' '}
                  <span className="font-semibold">User Management</span>.
                </p>
              )}
            </div>
            )}
          </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant/30 dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-[#0b1326] flex gap-3">
          <button
            type="button"
            onClick={closePanel}
            className="flex-1 py-2.5 px-4 border border-outline-variant/50 text-on-surface rounded-lg font-semibold text-sm hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors"
          >
            {editingWorkspace && activeTab === 'members' ? 'Done' : 'Cancel'}
          </button>
          {(!editingWorkspace || activeTab === 'details') && (
            <button
              type="submit"
              form="workspace-form"
              disabled={
                loading ||
                (!editingWorkspace && workspaceRoles.length === 0)
              }
              className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {loading && (
                <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
              )}
              {editingWorkspace ? 'Save Changes' : 'Create Workspace'}
            </button>
          )}
        </div>
      </div>

      <DynamicMessagePopUp
        isOpen={popup.isOpen}
        variant={popup.variant}
        title={popup.title}
        message={popup.message}
        confirmLabel={popup.confirmLabel}
        cancelLabel={popup.cancelLabel}
        hideCancel={popup.hideCancel}
        loading={loading}
        onConfirm={popup.onConfirm || closePopup}
        onCancel={closePopup}
      />
    </div>
  );
};

export default WorkspaceManagement;
