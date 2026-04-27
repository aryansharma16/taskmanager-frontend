import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import menuItems from '../config/sidebarMenu.json';
import ThemeToggle from './ThemeToggle';
import { logout } from '../features/auth/authSlice';

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [openDropdowns, setOpenDropdowns] = useState({});

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const toggleDropdown = (id) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <aside className="w-64 h-screen bg-surface-container-lowest dark:bg-background border-r border-outline-variant/30 dark:border-outline-variant/20 flex flex-col fixed left-0 top-0 z-40 transition-colors duration-300">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center px-6 border-b border-outline-variant/30 dark:border-outline-variant/20">
        <span className="text-xl font-extrabold text-on-surface font-['Manrope'] tracking-tight dark:font-['Space_Grotesk'] dark:italic">
          the Motion
        </span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
        {menuItems.map((item) => (
          <div key={item.id}>
            {item.subItems ? (
              <>
                <button
                  onClick={() => toggleDropdown(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    openDropdowns[item.id]
                      ? 'bg-surface-container-low dark:bg-surface-container-highest/50 text-on-surface'
                      : 'text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.title}</span>
                  </div>
                  <span className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${openDropdowns[item.id] ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                {openDropdowns[item.id] && (
                  <div className="mt-1 ml-4 pl-4 border-l border-outline-variant/30 dark:border-outline-variant/20 space-y-1 animate-fade-in">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.id}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                            isActive
                              ? 'bg-primary-container/10 dark:bg-primary/10 text-primary-container dark:text-primary'
                              : 'text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface'
                          }`
                        }
                      >
                        <span className="material-symbols-outlined text-[18px]">{subItem.icon}</span>
                        <span>{subItem.title}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-container/10 dark:bg-primary/10 text-primary-container dark:text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.title}</span>
              </NavLink>
            )}
          </div>
        ))}
      </div>

      {/* Sidebar Footer (Settings / Logout / Theme) */}
      <div className="p-4 border-t border-outline-variant/30 dark:border-outline-variant/20 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Appearance</span>
          <ThemeToggle />
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm text-error hover:bg-error-container/30 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Logout</span>
        </button>
        <div className="pt-2 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">Admin User</p>
            <p className="text-xs text-on-surface-variant truncate">admin@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
