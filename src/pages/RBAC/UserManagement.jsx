import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUsers,
  createUser,
  updateUserRole,
  deleteUser,
  clearUserError,
  clearUserSuccess,
} from '../../features/users/userSlice';
import { fetchRoles } from '../../features/roles/roleSlice';
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

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: '',
};

// Soft palette for avatar gradients — picked deterministically from the user id/email
const AVATAR_GRADIENTS = [
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-600',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-indigo-600',
  'from-fuchsia-400 to-purple-600',
  'from-cyan-400 to-blue-600',
  'from-lime-400 to-green-600',
  'from-yellow-400 to-rose-500',
];

const hashString = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const getInitials = (name = '') => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase().slice(0, 2);
};

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

const getRoleId = (role) => {
  if (!role) return '';
  if (typeof role === 'string') return role;
  return role._id || '';
};

const getRoleName = (role, rolesById) => {
  if (!role) return null;
  if (typeof role === 'object' && role.name) return role.name;
  return rolesById?.get(role)?.name || null;
};

const UserManagement = () => {
  const dispatch = useDispatch();
  const { users, loading, error, successMessage } = useSelector((state) => state.users);
  const { roles } = useSelector((state) => state.roles);

  // Panel + form state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  // Popup state
  const [popup, setPopup] = useState(INITIAL_POPUP);
  const closePopup = () => setPopup((p) => ({ ...p, isOpen: false }));

  // Initial data
  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchRoles());
  }, [dispatch]);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        dispatch(clearUserSuccess());
        dispatch(clearUserError());
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage, error, dispatch]);

  const rolesById = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => m.set(r._id, r));
    return m;
  }, [roles]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const roleName = getRoleName(u.role, rolesById) || '';
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q)
      );
    });
  }, [users, search, rolesById]);

  const openCreatePanel = () => {
    setEditingUser(null);
    setFormData({
      ...EMPTY_FORM,
      role: roles[0]?._id ?? '',
    });
    setIsPanelOpen(true);
  };

  const openEditPanel = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: getRoleId(user.role),
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setEditingUser(null), 300);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitCreate = (payload) => {
    dispatch(createUser(payload))
      .unwrap()
      .then(() => closePanel())
      .catch(() => {});
  };

  const submitRoleUpdate = () => {
    dispatch(updateUserRole({ id: editingUser._id, role: formData.role }))
      .unwrap()
      .then(() => closePanel())
      .catch(() => {});
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingUser) {
      const previousRoleId = getRoleId(editingUser.role);
      if (previousRoleId === formData.role) {
        closePanel();
        return;
      }

      const newRole = rolesById.get(formData.role);
      setPopup({
        isOpen: true,
        variant: 'warning',
        title: 'Change role for this user?',
        message: (
          <>
            <span className="font-semibold text-on-surface">{editingUser.name}</span> will be
            reassigned to{' '}
            <span className="font-semibold text-on-surface">
              {newRole?.name || 'the selected role'}
            </span>
            . Their permissions will update immediately.
          </>
        ),
        confirmLabel: 'Update Role',
        cancelLabel: 'Cancel',
        hideCancel: false,
        onConfirm: () => {
          closePopup();
          submitRoleUpdate();
        },
      });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: formData.role,
    };
    submitCreate(payload);
  };

  const handleDelete = (user) => {
    setPopup({
      isOpen: true,
      variant: 'danger',
      title: 'Remove this user?',
      message: (
        <>
          You're about to permanently remove{' '}
          <span className="font-semibold text-on-surface">{user.name}</span>{' '}
          (<span className="font-mono">{user.email}</span>) from the organisation.
          They will lose access immediately and this cannot be undone.
        </>
      ),
      confirmLabel: 'Remove User',
      cancelLabel: 'Keep User',
      hideCancel: false,
      onConfirm: () => {
        dispatch(deleteUser(user._id))
          .unwrap()
          .then(() => closePopup())
          .catch(() => closePopup());
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in relative h-full">
      {/* Alerts */}
      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          {error}
          <button onClick={() => dispatch(clearUserError())}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-secondary-container text-on-secondary-container p-4 rounded-lg font-medium text-sm flex items-center justify-between">
          {successMessage}
          <button onClick={() => dispatch(clearUserSuccess())}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Manrope'] dark:font-['Space_Grotesk'] text-[28px] font-bold dark:font-semibold text-on-surface tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Invite teammates and assign roles to control their access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 bg-surface-container-lowest dark:bg-background border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 dark:focus:border-primary outline-none transition-all"
            />
          </div>
          <button
            onClick={openCreatePanel}
            className="flex items-center gap-2 px-4 py-2 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Invite User
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: users.length, icon: 'group', tone: 'primary' },
          {
            label: 'Roles',
            value: roles.length,
            icon: 'badge',
            tone: 'tertiary',
          },
          {
            label: 'System Roles',
            value: roles.filter((r) => r.isCustom === false).length,
            icon: 'verified',
            tone: 'secondary',
          },
          {
            label: 'Custom Roles',
            value: roles.filter((r) => r.isCustom).length,
            icon: 'tune',
            tone: 'error',
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

      {/* Table */}
      <div className="bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 shadow-sm overflow-hidden relative">
        {loading && users.length === 0 && (
          <div className="absolute inset-0 bg-surface-container-lowest/50 dark:bg-background/50 z-10 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
              refresh
            </span>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low dark:bg-surface-container-highest/50 border-b border-outline-variant/30 dark:border-outline-variant/20">
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 dark:divide-outline-variant/10">
              {filteredUsers.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-10 text-center text-on-surface-variant text-sm"
                  >
                    {search
                      ? `No users match "${search}".`
                      : 'No users yet. Invite your first teammate to get started.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleObj =
                    typeof user.role === 'object' ? user.role : rolesById.get(user.role);
                  const roleName = roleObj?.name || '—';
                  const roleScope = roleObj?.scope;
                  const gradient =
                    AVATAR_GRADIENTS[hashString(user._id || user.email) % AVATAR_GRADIENTS.length];

                  return (
                    <tr
                      key={user._id}
                      className="hover:bg-surface-container-low/50 dark:hover:bg-surface-container-highest/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm`}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-on-surface truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-container/15 text-primary-container border border-primary-container/30 dark:bg-primary/15 dark:text-primary dark:border-primary/30">
                          <span className="material-symbols-outlined text-[14px]">badge</span>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {roleScope ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-tertiary-container/10 text-tertiary border-tertiary-container/20 dark:bg-tertiary/10 dark:text-tertiary dark:border-tertiary/20 uppercase">
                            {roleScope}
                          </span>
                        ) : (
                          <span className="text-xs text-outline">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditPanel(user)}
                            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Change role"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              manage_accounts
                            </span>
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                            title="Remove user"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              person_remove
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backdrop */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-on-background/20 dark:bg-background/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={closePanel}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-surface-container-lowest dark:bg-[#0b1326] shadow-2xl z-50 border-l border-outline-variant/30 dark:border-outline-variant/20 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30 dark:border-outline-variant/20">
          <h2 className="text-xl font-bold text-on-surface">
            {editingUser ? 'Change User Role' : 'Invite New User'}
          </h2>
          <button
            onClick={closePanel}
            className="p-2 text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="user-form" onSubmit={handleSubmit} className="space-y-5">
            {editingUser && (
              <div className="flex items-center gap-3 p-4 bg-surface-container-low/60 dark:bg-surface-container-highest/30 rounded-lg border border-outline-variant/30">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${
                    AVATAR_GRADIENTS[
                      hashString(editingUser._id || editingUser.email) % AVATAR_GRADIENTS.length
                    ]
                  } flex items-center justify-center text-white text-sm font-bold`}
                >
                  {getInitials(editingUser.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-on-surface truncate">
                    {editingUser.name}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {editingUser.email}
                  </p>
                </div>
              </div>
            )}

            {!editingUser && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface">
                    Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
                    className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface">
                    Email <span className="text-error">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                    placeholder="jane@company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-on-surface">
                    Temporary Password <span className="text-error">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                    placeholder="At least 6 characters"
                  />
                  <p className="text-[11px] text-on-surface-variant">
                    The user can change this after first login.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">
                Role <span className="text-error">*</span>
              </label>
              {roles.length === 0 ? (
                <div className="px-4 py-3 bg-error-container/30 text-on-error-container border border-error/30 rounded-lg text-sm">
                  No roles available. Please create a role first in{' '}
                  <span className="font-semibold">Role Management</span>.
                </div>
              ) : (
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-surface dark:bg-surface-container border border-outline-variant/40 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container dark:focus:ring-primary/30 outline-none"
                >
                  <option value="" disabled>
                    Select a role
                  </option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} · {r.scope}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-on-surface-variant">
                Determines what this user can access across the organisation.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
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
            form="user-form"
            disabled={loading || roles.length === 0}
            className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {loading && (
              <span className="material-symbols-outlined animate-spin text-[18px]">
                refresh
              </span>
            )}
            {editingUser ? 'Update Role' : 'Send Invite'}
          </button>
        </div>
      </div>

      {/* Confirmation Popup */}
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

export default UserManagement;
