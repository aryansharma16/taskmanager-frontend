import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRoles, createRole, updateRole, deleteRole, clearRoleError, clearRoleSuccess } from '../../features/roles/roleSlice';
import DynamicMessagePopUp from '../../components/DynamicMessagePopUp';
import SearchableMultiSelect from '../../components/SearchableMultiSelect';

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

// Preset permission catalogue. Users can also add their own (allowCustom).
const PERMISSION_OPTIONS = [
  { value: '*', label: '*', group: 'System', description: 'Wildcard — grants every permission' },

  { value: 'create:role', group: 'Roles', description: 'Create new roles' },
  { value: 'read:role',   group: 'Roles', description: 'View roles and their permissions' },
  { value: 'update:role', group: 'Roles', description: 'Modify existing roles' },
  { value: 'delete:role', group: 'Roles', description: 'Delete custom roles' },

  { value: 'create:user', group: 'Users', description: 'Create user accounts' },
  { value: 'read:user',   group: 'Users', description: 'View user profiles' },
  { value: 'update:user', group: 'Users', description: 'Edit user profiles & assignments' },
  { value: 'delete:user', group: 'Users', description: 'Remove user accounts' },
  { value: 'invite:user', group: 'Users', description: 'Send organisation invites' },

  { value: 'create:workspace', group: 'Workspaces', description: 'Create workspaces' },
  { value: 'read:workspace',   group: 'Workspaces', description: 'View workspaces' },
  { value: 'update:workspace', group: 'Workspaces', description: 'Edit workspace settings' },
  { value: 'delete:workspace', group: 'Workspaces', description: 'Delete workspaces' },

  { value: 'create:project', group: 'Projects', description: 'Create projects' },
  { value: 'read:project',   group: 'Projects', description: 'View projects' },
  { value: 'update:project', group: 'Projects', description: 'Edit projects' },
  { value: 'delete:project', group: 'Projects', description: 'Delete projects' },

  { value: 'create:task', group: 'Tasks', description: 'Create tasks' },
  { value: 'read:task',   group: 'Tasks', description: 'View tasks' },
  { value: 'update:task', group: 'Tasks', description: 'Edit tasks' },
  { value: 'delete:task', group: 'Tasks', description: 'Delete tasks' },
  { value: 'assign:task', group: 'Tasks', description: 'Assign tasks to members' },

  { value: 'manage:billing',      group: 'Billing & Settings', description: 'View and manage billing' },
  { value: 'manage:settings',     group: 'Billing & Settings', description: 'Change organisation settings' },
  { value: 'manage:integrations', group: 'Billing & Settings', description: 'Connect third-party integrations' },

  { value: 'view:audit-logs', group: 'Insights', description: 'Read audit logs' },
  { value: 'view:analytics',  group: 'Insights', description: 'Read analytics dashboards' },
];

// Permission strings: lowercase, allow a-z, 0-9, ':', '_', '-', '.', '*'
const PERMISSION_REGEX = /^[a-z0-9_\-.:*]+$/;
const normalizePermission = (raw) => raw.trim().toLowerCase();
const validatePermission = (raw) => {
  const v = normalizePermission(raw);
  return v.length > 0 && PERMISSION_REGEX.test(v);
};

const RoleManagement = () => {
  const dispatch = useDispatch();
  const { roles, loading, error, successMessage } = useSelector((state) => state.roles);

  // Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Confirmation Popup State
  const [popup, setPopup] = useState(INITIAL_POPUP);
  const closePopup = () => setPopup((p) => ({ ...p, isOpen: false }));

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    scope: 'ORGANISATION',
    description: '',
    permissions: []
  });

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  // Handle temporary alerts
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        dispatch(clearRoleSuccess());
        dispatch(clearRoleError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error, dispatch]);

  const openCreatePanel = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      scope: 'ORGANISATION',
      description: '',
      permissions: []
    });
    setIsPanelOpen(true);
  };

  const proceedToEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      scope: role.scope,
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : []
    });
    setIsPanelOpen(true);
  };

  const openEditPanel = (role) => {
    if (role.isCustom === false) {
      setPopup({
        isOpen: true,
        variant: 'warning',
        title: 'Edit System Role?',
        message: (
          <>
            <span className="font-semibold text-on-surface">{role.name}</span> is a built-in system role.
            Modifying it can affect access control across the entire organisation.
            Are you sure you want to continue?
          </>
        ),
        confirmLabel: 'Edit Anyway',
        cancelLabel: 'Cancel',
        hideCancel: false,
        onConfirm: () => {
          closePopup();
          proceedToEdit(role);
        },
      });
      return;
    }
    proceedToEdit(role);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setEditingRole(null), 300); // Wait for transition
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submitRole = (payload) => {
    if (editingRole) {
      dispatch(updateRole({ id: editingRole._id, roleData: payload }))
        .unwrap()
        .then(() => {
          closePanel();
          dispatch(fetchRoles());
        })
        .catch(() => {});
    } else {
      dispatch(createRole(payload))
        .unwrap()
        .then(() => {
          closePanel();
          dispatch(fetchRoles());
        })
        .catch(() => {});
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const permissionsArray = Array.from(new Set(formData.permissions))
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const payload = {
      ...formData,
      name: formData.name.trim().toUpperCase(),
      permissions: permissionsArray,
    };

    if (editingRole) {
      setPopup({
        isOpen: true,
        variant: 'warning',
        title: 'Save changes to this role?',
        message: (
          <>
            You're updating <span className="font-semibold text-on-surface">{editingRole.name}</span>.
            Members assigned to this role will immediately get the new permissions.
          </>
        ),
        confirmLabel: 'Save Changes',
        cancelLabel: 'Cancel',
        hideCancel: false,
        onConfirm: () => {
          closePopup();
          submitRole(payload);
        },
      });
      return;
    }

    submitRole(payload);
  };

  const handleDelete = (role) => {
    if (role.isCustom === false) {
      setPopup({
        isOpen: true,
        variant: 'warning',
        title: 'Cannot Delete System Role',
        message: (
          <>
            <span className="font-semibold text-on-surface">{role.name}</span> is a built-in system role
            and cannot be deleted. You can create a custom role instead and assign the desired permissions.
          </>
        ),
        confirmLabel: 'Got it',
        hideCancel: true,
        onConfirm: closePopup,
      });
      return;
    }

    setPopup({
      isOpen: true,
      variant: 'danger',
      title: 'Delete Role?',
      message: (
        <>
          You're about to permanently delete{' '}
          <span className="font-semibold text-on-surface">{role.name}</span>.
          This action cannot be undone and any user currently assigned to this role will lose its permissions.
        </>
      ),
      confirmLabel: 'Delete Role',
      cancelLabel: 'Keep Role',
      hideCancel: false,
      onConfirm: () => {
        dispatch(deleteRole(role._id))
          .unwrap()
          .then(() => {
            closePopup();
            dispatch(fetchRoles());
          })
          .catch(() => closePopup());
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in relative h-full">
      {/* Alert Messages */}
      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          {error}
          <button onClick={() => dispatch(clearRoleError())}><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}
      {successMessage && (
        <div className="bg-secondary-container text-on-secondary-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          {successMessage}
          <button onClick={() => dispatch(clearRoleSuccess())}><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Manrope'] dark:font-['Space_Grotesk'] text-[28px] font-bold dark:font-semibold text-on-surface tracking-tight">
            Role Management
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Define roles and configure system permissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">search</span>
            <input 
              type="text" 
              placeholder="Search roles..." 
              className="pl-10 pr-4 py-2 bg-surface-container-lowest dark:bg-background border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 dark:focus:border-primary outline-none transition-all"
            />
          </div>
          <button 
            onClick={openCreatePanel}
            className="flex items-center gap-2 px-4 py-2 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Role
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 shadow-sm overflow-hidden relative">
        {loading && roles.length === 0 && (
          <div className="absolute inset-0 bg-surface-container-lowest/50 dark:bg-background/50 z-10 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">refresh</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low dark:bg-surface-container-highest/50 border-b border-outline-variant/30 dark:border-outline-variant/20">
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Role Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Scope</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 dark:divide-outline-variant/10">
              {roles.length === 0 && !loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant text-sm">
                    No roles found. Create one to get started.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role._id} className="hover:bg-surface-container-low/50 dark:hover:bg-surface-container-highest/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-container/10 dark:bg-primary/10 flex items-center justify-center text-primary-container dark:text-primary">
                          <span className="material-symbols-outlined text-[18px]">badge</span>
                        </div>
                        <span className="font-semibold text-sm text-on-surface">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-tertiary-container/10 text-tertiary border-tertiary-container/20 dark:bg-tertiary/10 dark:text-tertiary dark:border-tertiary/20 uppercase">
                        {role.scope}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant max-w-[200px] truncate" title={role.description}>
                      {role.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions && role.permissions.slice(0, 2).map((perm, i) => (
                          <span key={i} className="px-2 py-0.5 bg-outline-variant/20 dark:bg-outline-variant/10 text-on-surface text-[10px] rounded border border-outline-variant/30">
                            {perm}
                          </span>
                        ))}
                        {role.permissions && role.permissions.length > 2 && (
                          <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface-variant text-[10px] rounded border border-outline-variant/30">
                            +{role.permissions.length - 2} more
                          </span>
                        )}
                        {(!role.permissions || role.permissions.length === 0) && (
                          <span className="text-sm text-outline">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditPanel(role)}
                          className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title="Edit Role"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(role)}
                          className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors" 
                          title="Delete Role"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Panel Overlay */}
      {isPanelOpen && (
        <div 
          className="fixed top-0 left-0 w-screen h-screen bg-on-background/20 dark:bg-background/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={closePanel}
        ></div>
      )}

      {/* Slide-over Panel */}
      <div 
        className={`fixed top-0 right-0 h-screen w-full max-w-lg bg-surface-container-lowest dark:bg-[#0b1326] shadow-2xl z-50 border-l border-outline-variant/30 dark:border-outline-variant/20 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 dark:border-outline-variant/20">
          <h2 className="text-xl font-bold text-on-surface">
            {editingRole ? 'Edit Role' : 'Create New Role'}
          </h2>
          <button 
            onClick={closePanel}
            className="p-2 text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="role-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Role Name <span className="text-error">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none uppercase"
                placeholder="e.g. PROJECT_MANAGER"
              />
              <p className="text-[11px] text-on-surface-variant">Role name will be uppercase automatically.</p>
            </div>

            {/* Scope Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Scope <span className="text-error">*</span></label>
              <select
                name="scope"
                value={formData.scope}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
              >
                <option value="ORGANISATION">Organisation</option>
                <option value="WORKSPACE">Workspace</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                maxLength={200}
                className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none resize-none"
                placeholder="Brief description of this role's purpose..."
              />
            </div>

            {/* Permissions Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="permissions-select" className="text-sm font-semibold text-on-surface">
                  Permissions
                </label>
                {formData.permissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, permissions: [] }))}
                    className="text-[11px] font-semibold text-on-surface-variant hover:text-error transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <SearchableMultiSelect
                id="permissions-select"
                value={formData.permissions}
                onChange={(next) => setFormData((prev) => ({ ...prev, permissions: next }))}
                options={PERMISSION_OPTIONS}
                placeholder="Search permissions or add your own..."
                allowCustom
                normalizeCustom={normalizePermission}
                validateCustom={validatePermission}
                emptyMessage="No matching permissions"
              />
              <p className="text-[11px] text-on-surface-variant">
                Pick from the catalogue or type a custom permission and press <kbd className="px-1 py-0.5 bg-surface-container-highest rounded text-[10px] font-mono">Enter</kbd>.
                Use lowercase letters, digits, and <span className="font-mono">: _ - . *</span>
              </p>
            </div>
            
          </form>
        </div>

        {/* Panel Footer */}
        <div className="p-6 border-t border-outline-variant/30 dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-[#0b1326] flex gap-3">
          <button
            type="button"
            onClick={closePanel}
            className="flex-1 py-2.5 px-4 border border-outline-variant/50 text-on-surface rounded-lg font-semibold text-sm hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="role-form"
            disabled={loading}
            className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading && <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>}
            {editingRole ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </div>

      {/* Confirmation / Warning Popup */}
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

export default RoleManagement;
