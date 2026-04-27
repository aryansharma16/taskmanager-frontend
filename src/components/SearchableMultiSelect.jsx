import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * SearchableMultiSelect
 * Material 3 styled multi-select with:
 *   - Chip display of selected values inside the trigger
 *   - Searchable dropdown
 *   - Optional grouping (option.group)
 *   - Optional "add custom" entry (allowCustom)
 *   - Full keyboard support: ArrowUp/Down, Enter, Backspace, Escape
 *
 * Props:
 *  - value          : string[]                            (controlled selected values)
 *  - onChange       : (next: string[]) => void
 *  - options        : Array<{ value: string, label?: string, group?: string, description?: string }>
 *  - placeholder    : string
 *  - allowCustom    : boolean    (default true)
 *  - normalizeCustom: (raw: string) => string  (default: trim + lowercase)
 *  - validateCustom : (raw: string) => boolean (return false to block adding)
 *  - emptyMessage   : string     (when no matches and not allowCustom)
 *  - maxChipsShown  : number     (collapse extra chips into a +N badge, default Infinity)
 *  - id             : string     (input id, for label htmlFor)
 *  - className      : string     (extra classes for outer wrapper)
 */
const SearchableMultiSelect = ({
  value = [],
  onChange,
  options = [],
  placeholder = 'Search or pick...',
  allowCustom = true,
  normalizeCustom = (raw) => raw.trim(),
  validateCustom = (raw) => raw.trim().length > 0,
  emptyMessage = 'No matches',
  maxChipsShown = Infinity,
  id,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Build a quick lookup so chips for unknown values still render with a label
  const optionMap = useMemo(() => {
    const m = new Map();
    options.forEach((o) => m.set(o.value, o));
    return m;
  }, [options]);

  // Filtered + grouped options for the dropdown
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      if (!q) return true;
      const hay = `${o.label ?? o.value} ${o.value} ${o.description ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  // Should we show the "Add custom" row?
  const normalizedQuery = normalizeCustom(query);
  const customAlreadyExists =
    optionMap.has(normalizedQuery) || value.includes(normalizedQuery);
  const showAddCustom =
    allowCustom &&
    normalizedQuery.length > 0 &&
    !customAlreadyExists &&
    validateCustom(query);

  // Flat list = filtered options followed by the optional "add custom" row.
  // activeIndex is an index into this flat list.
  const flatLength = filtered.length + (showAddCustom ? 1 : 0);

  // Keep activeIndex inside bounds whenever results change
  useEffect(() => {
    setActiveIndex((prev) => {
      if (flatLength === 0) return 0;
      if (prev >= flatLength) return flatLength - 1;
      if (prev < 0) return 0;
      return prev;
    });
  }, [flatLength]);

  // Close on outside click
  useEffect(() => {
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  const isSelected = (val) => value.includes(val);

  const toggle = (val) => {
    if (!val) return;
    const next = isSelected(val) ? value.filter((v) => v !== val) : [...value, val];
    onChange?.(next);
  };

  const addCustom = () => {
    const v = normalizeCustom(query);
    if (!v || !validateCustom(query) || isSelected(v)) {
      setQuery('');
      return;
    }
    onChange?.([...value, v]);
    setQuery('');
  };

  const removeAt = (val) => {
    onChange?.(value.filter((v) => v !== val));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((i) => (flatLength === 0 ? 0 : (i + 1) % flatLength));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((i) => (flatLength === 0 ? 0 : (i - 1 + flatLength) % flatLength));
    } else if (e.key === 'Enter') {
      if (!isOpen) return;
      e.preventDefault();
      if (activeIndex < filtered.length) {
        toggle(filtered[activeIndex].value);
        setQuery('');
      } else if (showAddCustom) {
        addCustom();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
      onChange?.(value.slice(0, -1));
    } else if (e.key === ',') {
      // Convenience: typing a comma commits the current query as a chip
      if (allowCustom && normalizedQuery.length > 0 && !customAlreadyExists) {
        e.preventDefault();
        addCustom();
      }
    }
  };

  // Group filtered options by `group`, preserving original order
  const groupedFiltered = useMemo(() => {
    const groups = new Map();
    filtered.forEach((opt, idx) => {
      const key = opt.group ?? '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ opt, flatIdx: idx });
    });
    return Array.from(groups.entries());
  }, [filtered]);

  const visibleChips = value.slice(0, maxChipsShown);
  const hiddenChipCount = value.length - visibleChips.length;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger / input area */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`min-h-[44px] w-full px-2 py-1.5 bg-surface dark:bg-surface-container border rounded-lg text-sm flex flex-wrap items-center gap-1.5 cursor-text transition-all ${
          isOpen
            ? 'border-primary-container dark:border-primary ring-2 ring-primary-container/30 dark:ring-primary/30'
            : 'border-outline-variant/40 hover:border-outline-variant/70'
        }`}
      >
        {visibleChips.map((val) => {
          const opt = optionMap.get(val);
          const isCustom = !opt;
          return (
            <span
              key={val}
              className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
                isCustom
                  ? 'bg-tertiary-container/30 text-on-tertiary-container border-tertiary-container/40 dark:bg-tertiary/15 dark:text-tertiary dark:border-tertiary/30'
                  : 'bg-primary-container/20 text-primary-container border-primary-container/30 dark:bg-primary/15 dark:text-primary dark:border-primary/30'
              }`}
              title={isCustom ? 'Custom permission' : opt?.description || val}
            >
              {opt?.label ?? val}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeAt(val);
                }}
                className="p-0.5 rounded hover:bg-on-surface/10 transition-colors"
                aria-label={`Remove ${val}`}
              >
                <span className="material-symbols-outlined text-[14px] leading-none">close</span>
              </button>
            </span>
          );
        })}

        {hiddenChipCount > 0 && (
          <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface-variant text-[11px] rounded border border-outline-variant/30">
            +{hiddenChipCount} more
          </span>
        )}

        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-0 outline-none focus:ring-0 px-2 py-1 text-sm text-on-surface placeholder:text-outline"
        />

        <span
          className={`material-symbols-outlined text-[20px] text-on-surface-variant transition-transform mr-1 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-surface-container-lowest dark:bg-[#0b1326] border border-outline-variant/30 dark:border-outline-variant/20 rounded-xl shadow-2xl z-50 animate-fade-in custom-scrollbar"
        >
          {groupedFiltered.length === 0 && !showAddCustom && (
            <div className="px-4 py-6 text-center text-sm text-on-surface-variant">
              {emptyMessage}
            </div>
          )}

          {groupedFiltered.map(([groupName, items]) => (
            <div key={groupName || '_'}>
              {groupName && (
                <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 sticky top-0 bg-surface-container-lowest dark:bg-[#0b1326]">
                  {groupName}
                </div>
              )}
              {items.map(({ opt, flatIdx }) => {
                const selected = isSelected(opt.value);
                const active = flatIdx === activeIndex;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    data-idx={flatIdx}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                    onClick={(e) => {
                      e.preventDefault();
                      toggle(opt.value);
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-primary-container/15 dark:bg-primary/10'
                        : 'hover:bg-surface-container-low/60 dark:hover:bg-surface-container-highest/40'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        selected
                          ? 'bg-primary-container dark:bg-primary border-primary-container dark:border-primary'
                          : 'border-outline-variant/60'
                      }`}
                    >
                      {selected && (
                        <span className="material-symbols-outlined text-[12px] text-white dark:text-on-primary">
                          check
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[12px] text-on-surface truncate">
                        {opt.label ?? opt.value}
                      </div>
                      {opt.description && (
                        <div className="text-[11px] text-on-surface-variant truncate">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {showAddCustom && (
            <button
              type="button"
              data-idx={filtered.length}
              onMouseEnter={() => setActiveIndex(filtered.length)}
              onClick={(e) => {
                e.preventDefault();
                addCustom();
                inputRef.current?.focus();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm border-t border-outline-variant/20 transition-colors ${
                activeIndex === filtered.length
                  ? 'bg-tertiary-container/20 dark:bg-tertiary/10'
                  : 'hover:bg-surface-container-low/60 dark:hover:bg-surface-container-highest/40'
              }`}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-tertiary-container/40 dark:bg-tertiary/15 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">add</span>
              </span>
              <span className="flex-1 min-w-0 text-on-surface">
                Add custom permission
                <span className="ml-2 font-mono text-[12px] text-tertiary truncate">
                  &quot;{normalizedQuery}&quot;
                </span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/70">
                Enter
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
