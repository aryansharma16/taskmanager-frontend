import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

const themes = [
  { value: 'light', icon: 'light_mode', label: 'Light' },
  { value: 'dark', icon: 'dark_mode', label: 'Dark' },
  { value: 'system', icon: 'desktop_windows', label: 'System' },
];

const DEFAULT_TRIGGER_CLASS =
  'flex items-center justify-center w-9 h-9 rounded-lg glass-panel text-on-surface hover:bg-on-surface/10 transition-all duration-200 active:scale-90';

const ThemeToggle = ({ triggerClassName, menuAlign = 'right', onOpenChange }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const currentIcon = themes.find((t) => t.value === theme)?.icon || 'dark_mode';

  return (
    <div className="relative" ref={menuRef}>
      {/* Toggle Button */}
      <button
        id="theme-toggle-btn"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName || DEFAULT_TRIGGER_CLASS}
        aria-label="Change theme"
        title="Change theme"
      >
        <span
          className="material-symbols-outlined text-[20px] transition-transform duration-300"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            // Override the global thin outlined axis values so the sun /
            // moon / desktop glyph reads as a solid, dense shape — the
            // default FILL=0 wght=400 sun was too sparse to see in light
            // mode at 20px next to the denser rail icons.
            fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24",
          }}
        >
          {currentIcon}
        </span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className={`absolute mt-2 w-40 glass-card rounded-xl shadow-2xl border border-outline-variant/30 overflow-hidden z-[100] animate-fade-in ${
            menuAlign === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {themes.map((t) => (
            <button
              key={t.value}
              id={`theme-option-${t.value}`}
              onClick={() => {
                setTheme(t.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-['Space_Grotesk'] transition-colors duration-150 ${
                theme === t.value
                  ? 'text-primary bg-on-surface/10'
                  : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
              {theme === t.value && (
                <span className="material-symbols-outlined text-[16px] ml-auto text-primary">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
