import { useAuth, UserRole } from '@/contexts/AuthContext';

export const useRoleAccess = () => {
  const { user, profile } = useAuth();

  const isAuthenticated = !!user;
  const isCustomer = profile?.role === 'customer';
  const isVendor = profile?.role === 'vendor';
  const isAdmin = profile?.role === 'admin';

  const canAccessCustomerFeatures = isAuthenticated && isCustomer;
  const canAccessVendorFeatures = isAuthenticated && isVendor;
  const canAccessAdminFeatures = isAuthenticated && isAdmin;

  const canAccessAnyDashboard = isAuthenticated && (isVendor || isAdmin);
  const canManageUsers = isAdmin;
  const canManageInventory = isVendor || isAdmin;

  const hasRole = (role: UserRole): boolean => {
    return profile?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return profile ? roles.includes(profile.role) : false;
  };

  const getRedirectPath = (): string => {
    if (!profile) return '/login';
    
    switch (profile.role) {
      case 'admin': return '/admin-dashboard';
      case 'vendor': return '/vendor-dashboard';
      case 'customer': return '/';
      default: return '/login';
    }
  };

  return {
    isAuthenticated,
    isCustomer,
    isVendor,
    isAdmin,
    canAccessCustomerFeatures,
    canAccessVendorFeatures,
    canAccessAdminFeatures,
    canAccessAnyDashboard,
    canManageUsers,
    canManageInventory,
    hasRole,
    hasAnyRole,
    getRedirectPath,
    currentRole: profile?.role,
    userProfile: profile,
  };
}; 