import React from 'react';

const Dashboard = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Manrope'] dark:font-['Space_Grotesk'] text-[28px] font-bold dark:font-semibold text-on-surface tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Here's what's happening with your projects today.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-container dark:bg-primary text-white dark:text-on-primary rounded-lg font-semibold text-sm hover:brightness-90 transition-all active:scale-[0.98]">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Task
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Tasks', value: '124', icon: 'task', color: 'text-primary' },
          { label: 'In Progress', value: '45', icon: 'pending_actions', color: 'text-secondary' },
          { label: 'Completed', value: '78', icon: 'check_circle', color: 'text-tertiary' },
          { label: 'Overdue', value: '1', icon: 'error', color: 'text-error' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-container-lowest dark:glass-panel p-6 rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low dark:bg-surface-container-highest ${stat.color}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">{stat.label}</p>
            <p className="text-[28px] font-bold text-on-surface">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity & Quick Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart / Activity Area */}
        <div className="lg:col-span-2 bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-on-surface">Weekly Progress</h2>
            <select className="bg-transparent text-sm text-on-surface-variant border-none outline-none cursor-pointer">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          {/* Mock Chart Area */}
          <div className="h-[250px] w-full flex items-end gap-2 justify-between">
            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2 group">
                <div className="w-full bg-surface-container-low dark:bg-surface-container-highest h-full rounded-t-sm relative flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-primary-container/80 dark:bg-primary/80 group-hover:bg-primary-container dark:group-hover:bg-primary transition-colors rounded-t-sm"
                    style={{ height: `${h}%` }}
                  ></div>
                </div>
                <span className="text-xs text-on-surface-variant font-medium">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Tasks list */}
        <div className="bg-surface-container-lowest dark:glass-panel rounded-xl border border-outline-variant/30 dark:border-outline-variant/20 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-on-surface">Priority Tasks</h2>
            <button className="text-sm text-primary-container dark:text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Update Authentication Flow', project: 'Frontend App', status: 'In Progress' },
              { title: 'Database Migration', project: 'Backend Services', status: 'Review' },
              { title: 'Client Presentation', project: 'Marketing', status: 'To Do' },
              { title: 'Fix Navigation Bug', project: 'Frontend App', status: 'In Progress' }
            ].map((task, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low dark:hover:bg-surface-container-highest/50 transition-colors border border-transparent hover:border-outline-variant/20 cursor-pointer">
                <input type="checkbox" className="mt-1 rounded border-outline-variant text-primary-container focus:ring-primary-container" />
                <div>
                  <p className="text-sm font-semibold text-on-surface">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-on-surface-variant">{task.project}</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
                    <span className="text-[10px] uppercase font-bold text-secondary">{task.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
