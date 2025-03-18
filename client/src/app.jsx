/**
 * App.jsx
 * 
 * Main application component for the CTF Platform. This component serves as the
 * entry point for the React application and handles routing, authentication state,
 * and global layout structure.
 * 
 * The application uses React Router for navigation and Redux for state management.
 * Authentication is handled via AWS Cognito integration.
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Amplify } from 'aws-amplify';
import { Toaster } from 'react-hot-toast';

// Store and authentication
import store from './redux/store';
import { checkAuthState } from './redux/actions/authActions';

// Layout components
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Authentication-related pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Main application pages
import DashboardPage from './pages/DashboardPage';
import ChallengesPage from './pages/challenges/ChallengesPage';
import ChallengeDetailPage from './pages/challenges/ChallengeDetailPage';
import ChallengeEnvironmentPage from './pages/challenges/ChallengeEnvironmentPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/user/ProfilePage';
import TeamManagementPage from './pages/teams/TeamManagementPage';
import TeamDetailPage from './pages/teams/TeamDetailPage';

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminChallengesPage from './pages/admin/AdminChallengesPage';
import AdminChallengeEditorPage from './pages/admin/AdminChallengeEditorPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';
import AdminEnvironmentsPage from './pages/admin/AdminEnvironmentsPage';

// Error and utility pages
import NotFoundPage from './pages/NotFoundPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import LoadingPage from './pages/LoadingPage';

// Config
import { amplifyConfig } from './config/aws-config';

// Initialize Amplify with configuration
Amplify.configure(amplifyConfig);

/**
 * PrivateRoute component - Ensures user is authenticated before allowing access
 * If not authenticated, redirects to login page
 */
const PrivateRoute = ({ children }) => {
  const isAuthenticated = store.getState().auth.isAuthenticated;
  const isLoading = store.getState().auth.isLoading;
  
  if (isLoading) {
    return <LoadingPage />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * AdminRoute component - Ensures user is authenticated and has admin privileges
 * If not an admin, redirects to access denied page
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = store.getState().auth;
  
  if (isLoading) {
    return <LoadingPage />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has admin role
  const isAdmin = user && user.role === 'admin';
  
  return isAdmin ? children : <Navigate to="/access-denied" replace />;
};

/**
 * Main App component
 */
const App = () => {
  const [initialized, setInitialized] = useState(false);
  
  // Check authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      await store.dispatch(checkAuthState());
      setInitialized(true);
    };
    
    initializeAuth();
  }, []);
  
  if (!initialized) {
    return <LoadingPage />;
  }
  
  return (
    <Provider store={store}>
      <Router>
        {/* Toast notifications container */}
        <Toaster position="top-right" />
        
        <Routes>
          {/* Authentication routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          
          {/* Main application routes (authenticated) */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } />
            
            <Route path="/challenges" element={
              <PrivateRoute>
                <ChallengesPage />
              </PrivateRoute>
            } />
            
            <Route path="/challenges/:challengeId" element={
              <PrivateRoute>
                <ChallengeDetailPage />
              </PrivateRoute>
            } />
            
            <Route path="/challenges/:challengeId/environment/:environmentId" element={
              <PrivateRoute>
                <ChallengeEnvironmentPage />
              </PrivateRoute>
            } />
            
            <Route path="/leaderboard" element={
              <PrivateRoute>
                <LeaderboardPage />
              </PrivateRoute>
            } />
            
            <Route path="/profile" element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } />
            
            <Route path="/teams" element={
              <PrivateRoute>
                <TeamManagementPage />
              </PrivateRoute>
            } />
            
            <Route path="/teams/:teamId" element={
              <PrivateRoute>
                <TeamDetailPage />
              </PrivateRoute>
            } />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            } />
            
            <Route path="/admin/challenges" element={
              <AdminRoute>
                <AdminChallengesPage />
              </AdminRoute>
            } />
            
            <Route path="/admin/challenges/:challengeId" element={
              <AdminRoute>
                <AdminChallengeEditorPage />
              </AdminRoute>
            } />
            
            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            } />
            
            <Route path="/admin/teams" element={
              <AdminRoute>
                <AdminTeamsPage />
              </AdminRoute>
            } />
            
            <Route path="/admin/environments" element={
              <AdminRoute>
                <AdminEnvironmentsPage />
              </AdminRoute>
            } />
            
            {/* Error routes */}
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
    </Provider>
  );
};

export default App;
