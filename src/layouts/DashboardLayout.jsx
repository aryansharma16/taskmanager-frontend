import React from 'react';
import Sidebar from '../components/Sidebar';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-on-surface flex selection:bg-primary-container selection:text-on-primary-container">
      {/* Fixed Sidebar */}
      <Sidebar />
      
      {/* Main Content Area - Offset by sidebar width */}
      <main className="flex-1 ml-64 min-h-screen overflow-x-hidden flex flex-col">
        {/* Top Header for Layout (optional, could be search/breadcrumbs) */}
        <header className="h-16 bg-surface-container-lowest dark:bg-background/80 backdrop-blur-md border-b border-outline-variant/30 dark:border-outline-variant/20 sticky top-0 z-30 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 text-on-surface-variant w-full max-w-md">
            <span className="material-symbols-outlined text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Search tasks, projects, or team members..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-outline"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors relative">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
