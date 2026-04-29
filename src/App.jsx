import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import DashboardLayout from './layouts/DashboardLayout';
import RoleManagement from './pages/RBAC/RoleManagement';
import UserManagement from './pages/RBAC/UserManagement';
import WorkspaceManagement from './pages/Workspaces/WorkspaceManagement';
import WorkspaceTasks from './pages/Tasks/WorkspaceTasks';
import StatusManagement from './pages/Statuses/StatusManagement';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rbac/roles" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RoleManagement />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rbac/users" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UserManagement />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/workspaces" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <WorkspaceManagement />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route
          path="/workspaces/:id/tasks"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <WorkspaceTasks />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspaces/:id/statuses"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <StatusManagement />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
