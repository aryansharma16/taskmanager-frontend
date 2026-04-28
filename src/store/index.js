import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import roleReducer from '../features/roles/roleSlice';
import userReducer from '../features/users/userSlice';
import workspaceReducer from '../features/workspaces/workspaceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    roles: roleReducer,
    users: userReducer,
    workspaces: workspaceReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});
