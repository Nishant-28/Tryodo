import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = true,
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen={true} text="Authenticating..." />;
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is logged in but profile is not loaded yet
  if (user && !profile) {
    return <LoadingSpinner fullScreen={true} text="Loading your profile..." />;
  }

  // Strict role checking - user must have the EXACT role
  if (user && profile && allowedRoles.length > 0) {
    if (!allowedRoles.includes(profile.role)) {
      // Redirect to user's designated dashboard based on their role
      const roleRedirects = {
        customer: '/',
        vendor: '/vendor-dashboard',
        admin: '/admin-dashboard',
      };
      
      return <Navigate to={roleRedirects[profile.role]} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute; 