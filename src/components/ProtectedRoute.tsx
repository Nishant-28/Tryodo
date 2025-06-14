import React, { useEffect, useState } from 'react';
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
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Shorter timeout for better UX on page reloads
  useEffect(() => {
    // If we have a valid cached session, use shorter timeout
    const timeoutDuration = hasValidCachedSession() ? 2000 : 3000;
    
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⏰ Auth loading timeout reached');
        setTimeoutReached(true);
      }
    }, timeoutDuration);

    return () => clearTimeout(timeout);
  }, [loading]);

  // Reset timeout when loading state changes
  useEffect(() => {
    if (!loading) {
      setTimeoutReached(false);
    }
  }, [loading]);

  // Clean up expired sessions on mount
  useEffect(() => {
    clearExpiredSession();
  }, []);

  // If we're still loading and haven't timed out, show spinner
  if (loading && !timeoutReached) {
    console.log('⏳ Auth still loading, showing spinner');
    return <LoadingSpinner />;
  }

  // If we've timed out or loading is done but no user, redirect to login
  if (timeoutReached || (!loading && !user)) {
    if (timeoutReached) {
      console.log('⏰ Auth timeout reached, redirecting to login');
    } else {
      console.log('🚫 No authenticated user, redirecting to login');
    }
    
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // If user exists but no profile, show error
  if (user && !profile) {
    console.log('❌ User found but no profile, redirecting to login');
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
    console.log(`🚫 Access denied. User role: ${profile.role}, Required: ${allowedRoles.join(', ')}`);
    
    // Redirect based on user role
    const roleRedirects = {
      customer: '/',
      vendor: '/vendor-dashboard',
      admin: '/admin-dashboard'
    };
    
    const roleRedirect = roleRedirects[profile.role] || '/';
    
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
  console.log('✅ Access granted for user:', profile?.role);
  return <>{children}</>;
};

export default ProtectedRoute; 