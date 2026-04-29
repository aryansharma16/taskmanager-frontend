import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import roleReducer from '../features/roles/roleSlice';
import userReducer from '../features/users/userSlice';
import workspaceReducer from '../features/workspaces/workspaceSlice';
import taskReducer from '../features/tasks/taskSlice';
import statusReducer from '../features/statuses/statusSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    roles: roleReducer,
    users: userReducer,
    workspaces: workspaceReducer,
    tasks: taskReducer,
    statuses: statusReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});
