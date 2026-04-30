import { useEffect, useState } from 'react';
import Sidebar, {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
} from '../components/Sidebar';

const SIDEBAR_PIN_STORAGE_KEY = 'sidebar:pinned';

const readInitialPinned = () => {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw);
  } catch {
    return true;
  }
};

const DashboardLayout = ({ children }) => {
  const [isPinned, setIsPinned] = useState(readInitialPinned);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_PIN_STORAGE_KEY,
        JSON.stringify(isPinned)
      );
    } catch {
      /* ignore quota / private mode errors */
    }
  }, [isPinned]);

  const togglePinned = () => setIsPinned((prev) => !prev);

  // Reserve only the rail width when unpinned — hover expansion overlays
  // the content so the page doesn't shift on every mouse-in/mouse-out.
  const reservedWidth = isPinned ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <div className="min-h-screen bg-background text-on-surface flex selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar isPinned={isPinned} onTogglePin={togglePinned} />

      <main
        style={{ marginLeft: reservedWidth }}
        className="flex-1 min-w-0 min-h-screen overflow-x-hidden flex flex-col transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      >
        <header className="h-16 bg-surface-container-lowest dark:bg-background/80 backdrop-blur-md border-b border-outline-variant/30 dark:border-outline-variant/20 sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-on-surface-variant flex-1 min-w-0 max-w-md">
            <span className="material-symbols-outlined text-[20px] shrink-0">search</span>
            <input
              type="text"
              placeholder="Search tasks, projects, or team members..."
              className="bg-transparent border-none outline-none text-sm w-full min-w-0 placeholder:text-outline"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors relative">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error"></span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1 min-w-0 min-h-0 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
