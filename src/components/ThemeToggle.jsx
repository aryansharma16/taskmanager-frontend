import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

const themes = [
  { value: 'light', icon: 'light_mode', label: 'Light' },
  { value: 'dark', icon: 'dark_mode', label: 'Dark' },
  { value: 'system', icon: 'desktop_windows', label: 'System' },
];

const ThemeToggle = () => {
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

  const currentIcon = themes.find((t) => t.value === theme)?.icon || 'dark_mode';

  return (
    <div className="relative" ref={menuRef}>
      {/* Toggle Button */}
      <button
        id="theme-toggle-btn"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-9 h-9 rounded-lg glass-panel text-on-surface hover:bg-on-surface/10 transition-all duration-200 active:scale-90"
        aria-label="Change theme"
        title="Change theme"
      >
        <span
          className="material-symbols-outlined text-[20px] transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          {currentIcon}
        </span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-40 glass-card rounded-xl shadow-2xl border border-outline-variant/30 overflow-hidden z-[100] animate-fade-in">
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
