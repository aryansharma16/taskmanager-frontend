import { useEffect, useMemo, useState } from 'react';
import TaskFormFields from './TaskFormFields';
import SubtaskList from './SubtaskList';
import AssignmentList from './AssignmentList';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import {
  getStatusId,
  getPriorityId,
  getInitials,
  gradientFor,
} from './taskHelpers';

/**
 * Slide-over panel that handles BOTH "create" and "edit" of a task. It also
 * exposes Subtasks and Assignments tabs when editing an existing task.
 *
 * Mode is inferred:
 *   - props.task is null/undefined  -> create mode
 *   - props.task is an object       -> edit mode
 *
 * The parent owns all data fetching and dispatches; this component is only
 * concerned with presentation, validation, and emitting callbacks.
 */
const TaskDetailPanel = ({
  open,
  task,
  parentTask,
  statuses = [],
  priorities = [],
  workspaceMembers = [],
  subtasks = [],
  subtasksLoading = false,
  assignments = [],
  onClose,
  onSubmit,
  onDelete,
  onRestore,
  onCreateSubtask,
  onOpenSubtask,
  onAddAssignment,
  onChangeAssignmentRole,
  onRemoveAssignment,
  canEdit = true,
  canDelete = true,
  canAssign = true,
  canCreateSubtask = true,
  submitting = false,
}) => {
  const isEditMode = Boolean(task);
  const [activeTab, setActiveTab] = useState('details');
  const [form, setForm] = useState({
    title: '',
    description: '',
    statusId: '',
    priorityId: '',
    dueDate: '',
  });
  const [errors, setErrors] = useState({});

  // Reset form whenever the panel opens or the task changes.
  useEffect(() => {
    if (!open) return;
    setActiveTab('details');
    setErrors({});
    if (isEditMode) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        statusId: getStatusId(task) || '',
        priorityId: getPriorityId(task) || '',
        dueDate: task.dueDate || '',
      });
    } else {
      setForm({
        title: '',
        description: '',
        statusId: statuses[0]?._id || '',
        priorityId: '',
        dueDate: '',
      });
    }
  }, [open, task, isEditMode, statuses]);

  const handleChange = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.title?.trim()) next.title = 'Title is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!validate()) return;

    // Build a minimal payload — never send empty strings as ids.
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || '',
      dueDate: form.dueDate || null,
    };
    if (form.statusId) payload.statusId = form.statusId;
    if (form.priorityId) payload.priorityId = form.priorityId;
    else if (isEditMode && getPriorityId(task)) payload.priorityId = null;
    if (!isEditMode && parentTask?._id) payload.parentTaskId = parentTask._id;

    onSubmit?.(payload);
  };

  // Members whose status is ACTIVE — those are valid assignees. Defensive
  // against the prop being a paginated envelope ({ items, page, ... }) or
  // anything else that isn't an array.
  const memberList = useMemo(() => {
    return Array.isArray(workspaceMembers)
      ? workspaceMembers
      : Array.isArray(workspaceMembers?.items)
      ? workspaceMembers.items
      : [];
  }, [workspaceMembers]);

  const activeMembers = useMemo(
    () => memberList.filter((m) => (m.status || 'ACTIVE') === 'ACTIVE'),
    [memberList]
  );

  // The API sometimes returns `createdBy` as a populated user object and
  // sometimes as a bare ObjectId string (depending on which endpoint
  // produced it). Normalise to a `{ name, email }` shape, falling back to
  // a workspace-member lookup when we only have an id.
  const creator = useMemo(() => {
    const cb = task?.createdBy;
    if (!cb) return null;
    if (typeof cb === 'object') {
      return {
        _id: cb._id,
        name: cb.name,
        email: cb.email,
        profilePic: cb.profilePic,
      };
    }
    // It's an ObjectId string — try to match in workspace members.
    const match = memberList.find((m) => {
      const u = m.user || m;
      return u?._id === cb;
    });
    if (match) {
      const u = match.user || match;
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        profilePic: u.profilePic,
      };
    }
    return { _id: cb };
  }, [task, memberList]);

  const isArchived = isEditMode && task?.isActive === false;

  if (!open) return null;

  // Short, copy-friendly task ref that doesn't expose the raw Mongo id.
  const shortRef = isEditMode && task?._id
    ? task._id.slice(-6).toUpperCase()
    : null;

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute top-0 right-0 h-screen w-full sm:w-[480px] md:w-[580px] lg:w-[620px] bg-surface dark:bg-surface-container-low shadow-2xl flex flex-col animate-slide-in border-l border-outline-variant/30 dark:border-outline-variant/15"
      >
        {/* Hero header */}
        <header className="relative overflow-hidden border-b border-outline-variant/30 dark:border-outline-variant/15">
          {/* Decorative gradient backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/15 dark:bg-primary/20 blur-3xl pointer-events-none"
          />

          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] border ${
                    isArchived
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                      : isEditMode
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {isArchived
                      ? 'archive'
                      : isEditMode
                      ? 'edit'
                      : parentTask
                      ? 'subdirectory_arrow_right'
                      : 'add_task'}
                  </span>
                  {isEditMode
                    ? isArchived
                      ? 'Archived'
                      : 'Edit task'
                    : parentTask
                    ? 'New subtask'
                    : 'New task'}
                </span>
                {shortRef && (
                  <code className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container-lowest/60 dark:bg-surface-container-highest/40 text-on-surface-variant border border-outline-variant/30 dark:border-outline-variant/20">
                    #{shortRef}
                  </code>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 text-on-surface-variant hover:text-on-surface flex-shrink-0 transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <h2 className="text-xl sm:text-[22px] font-bold text-on-surface tracking-tight leading-snug pr-2">
              {isEditMode
                ? task.title || 'Untitled task'
                : parentTask
                ? `Subtask of "${parentTask.title}"`
                : 'Create a task'}
            </h2>

            {isEditMode && (task.status || task.priority || creator) && (
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {task.status && <StatusBadge status={task.status} size="xs" />}
                {task.priority && (
                  <PriorityBadge priority={task.priority} size="xs" />
                )}
                {creator && (creator.name || creator.email) && (
                  <span
                    className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container-lowest/70 dark:bg-surface-container-highest/40 text-on-surface-variant border border-outline-variant/30 dark:border-outline-variant/20"
                    title={`Created by ${creator.name || creator.email}`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${gradientFor(
                        creator._id || creator.email || creator.name
                      )} flex items-center justify-center text-white text-[7px] font-bold`}
                    >
                      {getInitials(creator.name || creator.email)}
                    </span>
                    {creator.name || creator.email}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Tabs (only when editing an existing task) */}
        {isEditMode && (
          <div className="px-4 pt-3 pb-1 border-b border-outline-variant/30 dark:border-outline-variant/15 bg-surface dark:bg-surface-container-low">
            <nav className="flex gap-1 overflow-x-auto custom-scrollbar -mb-px">
              {[
                {
                  id: 'details',
                  label: 'Details',
                  icon: 'info',
                  count: null,
                },
                {
                  id: 'subtasks',
                  label: 'Subtasks',
                  icon: 'checklist',
                  count: subtasks.length,
                },
                {
                  id: 'assignees',
                  label: 'Assignees',
                  icon: 'group',
                  count: assignments.length,
                },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'text-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {tab.icon}
                    </span>
                    {tab.label}
                    {tab.count !== null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                          isActive
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-container-low dark:bg-surface-container-highest/50 text-on-surface-variant'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {isArchived && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                archive
              </span>
              <span className="flex-1">
                This task is archived. Restore it before making further
                changes.
              </span>
              {onRestore && (
                <button
                  type="button"
                  onClick={onRestore}
                  className="px-2.5 py-1 rounded-md font-bold bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                >
                  Restore
                </button>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <TaskFormFields
                value={form}
                onChange={handleChange}
                statuses={statuses}
                priorities={priorities}
                errors={errors}
                disabled={!canEdit || isArchived}
              />

              {/* Meta panel — creator + timestamps. Always shows the creator
                  even when only an id is available, so the field never feels
                  "empty" the way the dash placeholder did. */}
              {isEditMode && (
                <div className="rounded-xl border border-outline-variant/30 dark:border-outline-variant/15 bg-surface-container-lowest/40 dark:bg-surface-container/30 p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">
                      history
                    </span>
                    Activity
                  </p>

                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientFor(
                        creator?._id || creator?.email || creator?.name || 'unknown'
                      )} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm`}
                      aria-hidden
                    >
                      {creator?.name || creator?.email
                        ? getInitials(creator.name || creator.email)
                        : '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Created by
                      </p>
                      <p className="text-sm font-semibold text-on-surface mt-0.5 truncate">
                        {creator?.name ||
                          creator?.email ||
                          (creator?._id ? 'Workspace user' : 'System')}
                      </p>
                      {creator?.email && creator?.name && (
                        <p className="text-[11px] text-on-surface-variant truncate">
                          {creator.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20 dark:border-outline-variant/10">
                    {task.createdAt && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            event_available
                          </span>
                          Created
                        </p>
                        <p
                          className="text-xs text-on-surface mt-1"
                          title={new Date(task.createdAt).toLocaleString()}
                        >
                          {new Date(task.createdAt).toLocaleDateString(
                            undefined,
                            { day: '2-digit', month: 'short', year: 'numeric' }
                          )}
                        </p>
                      </div>
                    )}
                    {task.updatedAt && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            update
                          </span>
                          Updated
                        </p>
                        <p
                          className="text-xs text-on-surface mt-1"
                          title={new Date(task.updatedAt).toLocaleString()}
                        >
                          {new Date(task.updatedAt).toLocaleDateString(
                            undefined,
                            { day: '2-digit', month: 'short', year: 'numeric' }
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          )}

          {activeTab === 'subtasks' && isEditMode && (
            <SubtaskList
              subtasks={subtasks}
              loading={subtasksLoading}
              onOpen={onOpenSubtask}
              onCreate={onCreateSubtask}
              canCreate={canCreateSubtask && !isArchived}
            />
          )}

          {activeTab === 'assignees' && isEditMode && (
            <AssignmentList
              assignments={assignments}
              candidates={activeMembers}
              onAdd={onAddAssignment}
              onChangeRole={onChangeAssignmentRole}
              onRemove={onRemoveAssignment}
              canManage={canAssign && !isArchived}
            />
          )}
        </div>

        {/* Footer */}
        {activeTab === 'details' && (
          <footer className="border-t border-outline-variant/30 dark:border-outline-variant/15 px-4 py-3 flex items-center justify-end gap-2 bg-surface dark:bg-surface-container-low">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 transition-colors"
            >
              Cancel
            </button>
            {canEdit && !isArchived && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-primary/20 transition-colors"
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      {isEditMode ? 'save' : 'add'}
                    </span>
                    {isEditMode
                      ? 'Save changes'
                      : parentTask
                      ? 'Create subtask'
                      : 'Create task'}
                  </>
                )}
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
};

export default TaskDetailPanel;
