import { useEffect, useMemo, useState } from 'react';
import TaskFormFields from './TaskFormFields';
import SubtaskList from './SubtaskList';
import AssignmentList from './AssignmentList';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { getStatusId, getPriorityId } from './taskHelpers';

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
  const activeMembers = useMemo(() => {
    const list = Array.isArray(workspaceMembers)
      ? workspaceMembers
      : Array.isArray(workspaceMembers?.items)
      ? workspaceMembers.items
      : [];
    return list.filter((m) => (m.status || 'ACTIVE') === 'ACTIVE');
  }, [workspaceMembers]);

  const isArchived = isEditMode && task?.isActive === false;

  if (!open) return null;

  return (
    <div className="fixed top-0 left-0 w-screen h-screen z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute top-0 right-0 h-screen w-full sm:w-[480px] md:w-[560px] bg-surface dark:bg-surface-container-low shadow-2xl flex flex-col animate-slide-in"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 p-4 border-b border-outline-variant/30 dark:border-outline-variant/15">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              {isEditMode
                ? isArchived
                  ? 'Archived task'
                  : 'Edit task'
                : parentTask
                ? `New subtask of "${parentTask.title}"`
                : 'New task'}
            </p>
            <h2 className="text-lg font-bold text-on-surface truncate">
              {isEditMode
                ? task.title || 'Untitled task'
                : 'Create a task'}
            </h2>
            {isEditMode && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {task.status && <StatusBadge status={task.status} size="xs" />}
                {task.priority && <PriorityBadge priority={task.priority} size="xs" />}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40 text-on-surface-variant flex-shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        {/* Tabs (only when editing an existing task) */}
        {isEditMode && (
          <div className="px-4 pt-2 border-b border-outline-variant/30 dark:border-outline-variant/15">
            <nav className="flex gap-1">
              {[
                { id: 'details', label: 'Details', icon: 'info' },
                { id: 'subtasks', label: `Subtasks (${subtasks.length})`, icon: 'checklist' },
                { id: 'assignees', label: `Assignees (${assignments.length})`, icon: 'group' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {isArchived && (
            <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">archive</span>
              <span className="flex-1">
                This task is archived. Restore it before making further changes.
              </span>
              {onRestore && (
                <button
                  type="button"
                  onClick={onRestore}
                  className="px-2 py-1 rounded font-semibold bg-amber-500/20 hover:bg-amber-500/30"
                >
                  Restore
                </button>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <TaskFormFields
                value={form}
                onChange={handleChange}
                statuses={statuses}
                priorities={priorities}
                errors={errors}
                disabled={!canEdit || isArchived}
              />

              {/* Created by / dates (read-only) */}
              {isEditMode && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/30 dark:border-outline-variant/15">
                  {task.createdBy && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Created by
                      </p>
                      <p className="text-xs text-on-surface mt-1 truncate">
                        {task.createdBy.name || task.createdBy.email || '—'}
                      </p>
                    </div>
                  )}
                  {task.createdAt && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Created
                      </p>
                      <p className="text-xs text-on-surface mt-1">
                        {new Date(task.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
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
          <footer className="border-t border-outline-variant/30 dark:border-outline-variant/15 p-3 flex items-center justify-between gap-2 bg-surface dark:bg-surface-container-low">
            <div>
              {isEditMode && canDelete && !isArchived && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-500/10"
                >
                  <span className="material-symbols-outlined text-[16px] align-middle mr-1">
                    archive
                  </span>
                  Archive
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low"
              >
                Cancel
              </button>
              {canEdit && !isArchived && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? 'Saving…'
                    : isEditMode
                    ? 'Save changes'
                    : parentTask
                    ? 'Create subtask'
                    : 'Create task'}
                </button>
              )}
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
};

export default TaskDetailPanel;
