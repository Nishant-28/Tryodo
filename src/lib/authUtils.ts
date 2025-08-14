// Utility functions for authentication session management

export const getSupabaseProjectRef = (): string => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (url) {
      return url.split('//')[1]?.split('.')[0] || 'default';
    }
    return 'default';
  } catch {
    return 'default';
  }
};

export const getAuthTokenKey = (): string => {
  const projectRef = getSupabaseProjectRef();
  return `sb-${projectRef}-auth-token`;
};

export const hasValidCachedSession = (): boolean => {
  try {
    const tokenKey = getAuthTokenKey();
    const cachedSession = localStorage.getItem(tokenKey);
    
    if (!cachedSession) {
      return false;
    }

    const sessionData = JSON.parse(cachedSession);
    
    if (!sessionData?.access_token || !sessionData?.expires_at) {
      return false;
    }

    // Check if session is expired (with 2 minute buffer for better UX)
    const expiryTime = new Date(sessionData.expires_at * 1000);
    const now = new Date();
    const buffer = 2 * 60 * 1000; // 2 minutes in milliseconds
    
    const isValid = expiryTime.getTime() > (now.getTime() + buffer);
    
    if (!isValid) {
      console.log('🕐 Cached session expired, clearing...');
      localStorage.removeItem(tokenKey);
    }
    
    return isValid;
  } catch (error) {
    console.log('❌ Error checking cached session:', error);
    return false;
  }
};

export const clearExpiredSession = (): void => {
  try {
    const tokenKey = getAuthTokenKey();
    const cachedSession = localStorage.getItem(tokenKey);
    
    if (cachedSession) {
      try {
        const sessionData = JSON.parse(cachedSession);
        
        if (sessionData?.expires_at) {
          const expiryTime = new Date(sessionData.expires_at * 1000);
          const now = new Date();
          
          if (expiryTime.getTime() <= now.getTime()) {
            localStorage.removeItem(tokenKey);
            console.log('🧹 Cleared expired session from localStorage');
          }
        }
      } catch (parseError) {
        // Invalid session data, remove it
        localStorage.removeItem(tokenKey);
        console.log('🧹 Cleared corrupted session data');
      }
    }
  } catch (error) {
    console.log('❌ Error clearing expired session:', error);
  }
};

export const getCachedUserInfo = (): { email?: string; role?: string } | null => {
  try {
    const tokenKey = getAuthTokenKey();
    const cachedSession = localStorage.getItem(tokenKey);
    
    if (!cachedSession || !hasValidCachedSession()) {
      return null;
    }

    const sessionData = JSON.parse(cachedSession);
    const user = sessionData?.user;
    
    if (user) {
      return {
        email: user.email,
        role: user.user_metadata?.role
      };
    }
    
    return null;
  } catch (error) {
    console.log('❌ Error getting cached user info:', error);
    return null;
  }
};

export const getSessionTimeRemaining = (): number => {
  try {
    const tokenKey = getAuthTokenKey();
    const cachedSession = localStorage.getItem(tokenKey);
    
    if (!cachedSession) {
      return 0;
    }

    const sessionData = JSON.parse(cachedSession);
    
    if (!sessionData?.expires_at) {
      return 0;
    }

    const expiryTime = new Date(sessionData.expires_at * 1000);
    const now = new Date();
    
    return Math.max(0, expiryTime.getTime() - now.getTime());
  } catch (error) {
    console.log('❌ Error getting session time remaining:', error);
    return 0;
  }
};

export const shouldRefreshSession = (): boolean => {
  try {
    const timeRemaining = getSessionTimeRemaining();
    // Refresh if less than 10 minutes remaining
    return timeRemaining > 0 && timeRemaining < (10 * 60 * 1000);
  } catch (error) {
    console.log('❌ Error checking if should refresh session:', error);
    return false;
  }
};

export const debugAuthStorage = (): void => {
  try {
    const tokenKey = getAuthTokenKey();
    const cachedSession = localStorage.getItem(tokenKey);
    
    if (cachedSession) {
      try {
        const sessionData = JSON.parse(cachedSession);
        // Basic debug info only for development
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth Debug:', {
            hasSession: true,
            userEmail: sessionData?.user?.email,
            isValid: hasValidCachedSession(),
            timeRemaining: Math.round(getSessionTimeRemaining() / 1000 / 60) + ' minutes'
          });
        }
      } catch {
        // Invalid session data format
      }
    }
  } catch (error) {
    // Error handled silently
  }
}; 