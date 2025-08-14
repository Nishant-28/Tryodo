import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasValidCachedSession, clearExpiredSession } from '@/lib/authUtils';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login' 
}) => {
  const { user, profile, loading, refreshSession } = useAuth();
  const location = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const refreshAttempted = useRef(false);

  // Extended timeout for better UX
  useEffect(() => {
    // Use longer timeout and consider cached session
    const timeoutDuration = hasValidCachedSession() ? 3000 : 5000;
    
    const timeout = setTimeout(() => {
      if (loading && !authChecked) {
        setTimeoutReached(true);
      }
    }, timeoutDuration);

    return () => clearTimeout(timeout);
  }, [loading, authChecked]);

  // Reset timeout when loading state changes
  useEffect(() => {
    if (!loading) {
      setTimeoutReached(false);
      setAuthChecked(true);
    }
  }, [loading]);

  // Clean up expired sessions and try to refresh on mount
  useEffect(() => {
    const initializeAuth = async () => {
      clearExpiredSession();
      
      // If we don't have a user but have a cached session, try refreshing
      if (!user && hasValidCachedSession() && !refreshAttempted.current) {
        refreshAttempted.current = true;
        console.log('🔄 ProtectedRoute: Attempting session refresh...');
        try {
          await refreshSession();
        } catch (error) {
          console.error('❌ ProtectedRoute: Session refresh failed:', error);
        }
      }
    };

    initializeAuth();
  }, [user, refreshSession]);

  // If we're still loading and haven't timed out, show spinner
  if (loading && !timeoutReached && !authChecked) {
    return <LoadingSpinner />;
  }

  // If we've timed out or loading is done but no user, redirect to login
  if (timeoutReached || (authChecked && !loading && !user)) {
    console.log('🚪 ProtectedRoute: Redirecting to login - timeout:', timeoutReached, 'authChecked:', authChecked, 'user:', !!user);
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // If user exists but no profile, show error
  if (user && !profile && authChecked) {
    console.log('⚠️ ProtectedRoute: User has no profile, redirecting to login');
    return (
      <Navigate 
        to={redirectTo} 
        state={{ 
          from: location.pathname, 
          error: 'Profile not found. Please try logging in again.' 
        }} 
        replace 
      />
    );
  }

  // Check role-based access
  if (allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.role)) {
    // Redirect based on user role
    const roleRedirects = {
      customer: '/',
      vendor: '/vendor-dashboard',
      admin: '/admin-dashboard',
      delivery_partner: '/delivery-partner-dashboard'
    };
    
    const roleRedirect = roleRedirects[profile.role as keyof typeof roleRedirects] || '/';
    
    console.log('🚫 ProtectedRoute: Role access denied, redirecting to:', roleRedirect);
    return (
      <Navigate 
        to={roleRedirect} 
        state={{ 
          from: location.pathname,
          error: `Access denied. You need ${allowedRoles.join(' or ')} role to access this page.`
        }} 
        replace 
      />
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default ProtectedRoute; 