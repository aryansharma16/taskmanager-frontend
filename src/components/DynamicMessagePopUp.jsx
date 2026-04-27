import React, { useEffect, useRef } from 'react';

const VARIANT_CONFIG = {
  danger: {
    icon: 'delete',
    iconBg: 'bg-error/10 dark:bg-error/15',
    iconColor: 'text-error',
    confirmBtn:
      'bg-error text-on-error hover:brightness-110 dark:hover:brightness-110',
  },
  warning: {
    icon: 'warning',
    iconBg: 'bg-tertiary-container/40 dark:bg-tertiary/15',
    iconColor: 'text-tertiary',
    confirmBtn:
      'bg-tertiary text-on-tertiary hover:brightness-110',
  },
  info: {
    icon: 'info',
    iconBg: 'bg-primary-container/30 dark:bg-primary/15',
    iconColor: 'text-primary',
    confirmBtn:
      'bg-primary-container dark:bg-primary text-white dark:text-on-primary hover:brightness-90',
  },
  success: {
    icon: 'check_circle',
    iconBg: 'bg-secondary-container/40 dark:bg-secondary/15',
    iconColor: 'text-secondary',
    confirmBtn:
      'bg-secondary text-on-secondary hover:brightness-110',
  },
};

/**
 * DynamicMessagePopUp
 * A reusable confirmation / alert modal for warnings, destructive actions,
 * info notices, and success confirmations.
 *
 * Props:
 *  - isOpen        : boolean                       (required)
 *  - variant       : 'danger' | 'warning' | 'info' | 'success'  (default: 'info')
 *  - title         : string                        (required)
 *  - message       : string | ReactNode            (optional)
 *  - icon          : string  (override material-symbols icon name)
 *  - confirmLabel  : string  (default: 'Confirm')
 *  - cancelLabel   : string  (default: 'Cancel')
 *  - onConfirm     : () => void
 *  - onCancel      : () => void
 *  - loading       : boolean (disables actions, shows spinner)
 *  - hideCancel    : boolean (single-action acknowledgement)
 *  - children      : ReactNode (extra content, e.g. an input or a list)
 */
const DynamicMessagePopUp = ({
  isOpen,
  variant = 'info',
  title,
  message,
  icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  hideCancel = false,
  children,
}) => {
  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.info;
  const confirmBtnRef = useRef(null);

  // Close on Escape / focus the confirm button on open
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKey = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel?.();
      } else if (e.key === 'Enter' && !loading) {
        onConfirm?.();
      }
    };

    window.addEventListener('keydown', handleKey);
    confirmBtnRef.current?.focus();

    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, loading, onCancel, onConfirm]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dynamic-popup-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-background/30 dark:bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={() => !loading && onCancel?.()}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md bg-surface-container-lowest dark:bg-[#0b1326] rounded-2xl shadow-2xl border border-outline-variant/30 dark:border-outline-variant/20 overflow-hidden animate-fade-in"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${config.iconBg}`}
            >
              <span
                className={`material-symbols-outlined text-[26px] ${config.iconColor}`}
              >
                {icon ?? config.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              {title && (
                <h3
                  id="dynamic-popup-title"
                  className="text-lg font-bold text-on-surface mb-1 font-['Manrope'] dark:font-['Space_Grotesk']"
                >
                  {title}
                </h3>
              )}
              {message && (
                <div className="text-sm text-on-surface-variant leading-relaxed">
                  {message}
                </div>
              )}
              {children && <div className="mt-3">{children}</div>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-surface-container-low/40 dark:bg-surface-container-highest/30 border-t border-outline-variant/30 dark:border-outline-variant/20 flex gap-3 justify-end">
          {!hideCancel && (
            <button
              type="button"
              onClick={() => !loading && onCancel?.()}
              disabled={loading}
              className="px-4 py-2 border border-outline-variant/50 text-on-surface rounded-lg font-semibold text-sm hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-70 ${config.confirmBtn}`}
          >
            {loading && (
              <span className="material-symbols-outlined animate-spin text-[18px]">
                refresh
              </span>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DynamicMessagePopUp;
