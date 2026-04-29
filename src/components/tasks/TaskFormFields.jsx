import { toDateInputValue } from './taskHelpers';

/**
 * Reusable, controlled form fields for create + edit. The parent owns the
 * `value` object and an `onChange(name, value)` callback. Pure presentation
 * — no Redux, no API calls.
 *
 * Shape of `value`:
 *   { title, description, statusId, priorityId, dueDate }
 */
const TaskFormFields = ({
  value,
  onChange,
  statuses = [],
  priorities = [],
  errors = {},
  disabled = false,
  showStatus = true,
}) => {
  const set = (name, v) => onChange?.(name, v);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant mb-1">
          Title <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={value.title || ''}
          onChange={(e) => set('title', e.target.value)}
          disabled={disabled}
          placeholder="What needs to be done?"
          className={`w-full px-3 py-2 rounded-lg border bg-surface dark:bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 ${
            errors.title
              ? 'border-rose-500/60'
              : 'border-outline-variant/40 dark:border-outline-variant/20'
          }`}
        />
        {errors.title && (
          <p className="mt-1 text-[11px] text-rose-500">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant mb-1">
          Description
        </label>
        <textarea
          rows={4}
          value={value.description || ''}
          onChange={(e) => set('description', e.target.value)}
          disabled={disabled}
          placeholder="Add a more detailed description (optional)"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Status */}
        {showStatus && (
          <div className={statuses.length === 0 ? 'col-span-2' : ''}>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Status
            </label>
            {statuses.length === 0 ? (
              <p className="text-[11px] text-outline italic px-3 py-2 rounded-lg border border-dashed border-outline-variant/40">
                No statuses defined for this workspace yet.
              </p>
            ) : (
              <div className="relative">
                <select
                  value={value.statusId || ''}
                  onChange={(e) => set('statusId', e.target.value)}
                  disabled={disabled}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                >
                  <option value="">— Select status —</option>
                  {statuses.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  expand_more
                </span>
              </div>
            )}
          </div>
        )}

        {/* Priority */}
        <div className={!showStatus || statuses.length === 0 ? 'col-span-2' : ''}>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            Priority
          </label>
          {priorities.length === 0 ? (
            <p className="text-[11px] text-outline italic px-3 py-2 rounded-lg border border-dashed border-outline-variant/40">
              No priorities defined.
            </p>
          ) : (
            <div className="relative">
              <select
                value={value.priorityId || ''}
                onChange={(e) => set('priorityId', e.target.value)}
                disabled={disabled}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              >
                <option value="">— None —</option>
                {priorities.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                expand_more
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Due date */}
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant mb-1">
          Due date
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toDateInputValue(value.dueDate)}
            onChange={(e) => set('dueDate', e.target.value || null)}
            disabled={disabled}
            className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/40 dark:border-outline-variant/20 bg-surface dark:bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          />
          {value.dueDate && (
            <button
              type="button"
              onClick={() => set('dueDate', null)}
              className="px-2.5 py-2 rounded-lg text-xs text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/40"
              title="Clear due date"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskFormFields;
