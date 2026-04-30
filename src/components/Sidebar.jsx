import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import menuItems from '../config/sidebarMenu.json';
import ThemeToggle from './ThemeToggle';
import { logout } from '../features/auth/authSlice';

export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const SIDEBAR_EXPANDED_WIDTH = 256;

const HOVER_LEAVE_DELAY_MS = 120;

// Trigger class used inside the sidebar so the theme toggle visually matches
// the other rail buttons (no glass-panel, sidebar-coloured hover state). The
// default glass-panel styling is preserved for the rest of the app via
// ThemeToggle's fallback.
const SIDEBAR_THEME_TRIGGER_CLASS =
  'flex items-center justify-center w-10 h-10 shrink-0 rounded-lg text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface transition-colors duration-150 active:scale-95';

const Sidebar = ({ isPinned, onTogglePin }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isHovered, setIsHovered] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const leaveTimerRef = useRef(null);

  // While the theme dropdown is open we keep the rail expanded — otherwise
  // the popup would get clipped by the 72px overflow-hidden rail if the
  // mouse drifts off the sidebar after opening it.
  const isExpanded = isPinned || isHovered || themeMenuOpen;
  const isOverlay = !isPinned && (isHovered || themeMenuOpen);

  useEffect(
    () => () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    },
    []
  );

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      leaveTimerRef.current = null;
    }, HOVER_LEAVE_DELAY_MS);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const toggleDropdown = (id) => {
    if (!isExpanded) return;
    setOpenDropdowns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Labels are kept in the DOM (no layout thrash) and fade with a tiny delay
  // when expanding so text appears after the rail has visibly opened.
  const labelClass = `whitespace-nowrap transition-opacity duration-150 ease-out ${
    isExpanded
      ? 'opacity-100 delay-100'
      : 'opacity-0 delay-0 pointer-events-none'
  }`;

  // All interactive rail rows share this layout. The 40x40 icon column lives
  // at the start of the row; with the parent's px-4 inset that puts every
  // icon at the rail's vertical center line (16 + 20 = 36px from the sidebar
  // edge, which matches the 72px rail's center).
  const rowClass =
    'w-full flex items-center gap-3 pr-3 rounded-lg font-semibold text-sm transition-colors duration-150';
  const iconBoxClass =
    'w-10 h-10 shrink-0 flex items-center justify-center';

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
        willChange: 'width',
      }}
      className={`h-screen bg-surface-container-lowest dark:bg-background border-r border-outline-variant/30 dark:border-outline-variant/20 flex flex-col fixed left-0 top-0 z-40 overflow-x-hidden transition-[width,box-shadow,background-color,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isOverlay ? 'shadow-2xl shadow-black/10 dark:shadow-black/40' : ''
      }`}
    >
      {/* Header */}
      <div className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-outline-variant/30 dark:border-outline-variant/20">
        <button
          onClick={onTogglePin}
          aria-label={isPinned ? 'Collapse sidebar' : 'Pin sidebar open'}
          title={isPinned ? 'Collapse sidebar' : 'Pin sidebar open'}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface transition-colors duration-150 active:scale-95"
        >
          <span className="material-symbols-outlined text-[22px]">
            {isPinned ? 'menu_open' : 'menu'}
          </span>
        </button>
        <span
          className={`text-xl font-extrabold text-on-surface font-['Manrope'] tracking-tight dark:font-['Space_Grotesk'] dark:italic ${labelClass}`}
        >
          the Motion
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-4 space-y-1 custom-scrollbar">
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.subItems ? (
              <>
                <button
                  onClick={() => toggleDropdown(item.id)}
                  title={!isExpanded ? item.title : undefined}
                  className={`${rowClass} ${
                    openDropdowns[item.id] && isExpanded
                      ? 'bg-surface-container-low dark:bg-surface-container-highest/50 text-on-surface'
                      : 'text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface'
                  }`}
                >
                  <span className={iconBoxClass}>
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                  </span>
                  <span className={`flex-1 text-left ${labelClass}`}>
                    {item.title}
                  </span>
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 transition-transform duration-200 ${labelClass} ${
                      openDropdowns[item.id] ? 'rotate-180' : ''
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {/* Dropdown — animated via the grid-template-rows trick */}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    openDropdowns[item.id] && isExpanded
                      ? 'grid-rows-[1fr]'
                      : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="mt-1 ml-5 pl-4 border-l border-outline-variant/30 dark:border-outline-variant/20 space-y-1 py-1">
                      {item.subItems.map((subItem) => (
                        <NavLink
                          key={subItem.id}
                          to={subItem.path}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors duration-150 ${
                              isActive
                                ? 'bg-primary-container/10 dark:bg-primary/10 text-primary-container dark:text-primary'
                                : 'text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface'
                            }`
                          }
                        >
                          <span className="material-symbols-outlined text-[18px] shrink-0">
                            {subItem.icon}
                          </span>
                          <span className="whitespace-nowrap">{subItem.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <NavLink
                to={item.path}
                title={!isExpanded ? item.title : undefined}
                className={({ isActive }) =>
                  `${rowClass} ${
                    isActive
                      ? 'bg-primary-container/10 dark:bg-primary/10 text-primary-container dark:text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface'
                  }`
                }
              >
                <span className={iconBoxClass}>
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                </span>
                <span className={labelClass}>{item.title}</span>
              </NavLink>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-outline-variant/30 dark:border-outline-variant/20 space-y-1">
        {/* Theme — structured like the other rail rows so the icon column
            lines up at exactly 36px from the sidebar edge in collapsed mode
            (w-full + shrink-0 stops flex from squashing the 40x40 button). */}
        <div className="w-full flex items-center gap-3 pr-3">
          <div className="shrink-0">
            <ThemeToggle
              triggerClassName={SIDEBAR_THEME_TRIGGER_CLASS}
              menuAlign="left"
              onOpenChange={setThemeMenuOpen}
            />
          </div>
          <span
            className={`text-sm font-semibold text-on-surface-variant ${labelClass}`}
          >
            Theme
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={!isExpanded ? 'Logout' : undefined}
          className={`${rowClass} text-error hover:bg-error-container/30`}
        >
          <span className={iconBoxClass}>
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </span>
          <span className={labelClass}>Logout</span>
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pt-2 pr-3">
          <span className={iconBoxClass}>
            <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              AD
            </span>
          </span>
          <div className={`flex-1 min-w-0 ${labelClass}`}>
            <p className="text-sm font-semibold text-on-surface truncate">
              Admin User
            </p>
            <p className="text-xs text-on-surface-variant truncate">
              admin@company.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
