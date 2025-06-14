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

    // Check if session is expired (with 1 minute buffer)
    const expiryTime = new Date(sessionData.expires_at * 1000);
    const now = new Date();
    const buffer = 60 * 1000; // 1 minute in milliseconds
    
    return expiryTime.getTime() > (now.getTime() + buffer);
  } catch (error) {
    console.log('❌ Error checking cached session:', error);
    return false;
  }
};

export const clearExpiredSession = (): void => {
  try {
    if (!hasValidCachedSession()) {
      const tokenKey = getAuthTokenKey();
      localStorage.removeItem(tokenKey);
      console.log('🧹 Cleared expired session from localStorage');
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

export const debugAuthStorage = (): void => {
  try {
    const tokenKey = getAuthTokenKey();
    const cachedSession = localStorage.getItem(tokenKey);
    
    console.log('🔍 Auth Storage Debug:', {
      tokenKey,
      hasSession: !!cachedSession,
      isValid: hasValidCachedSession(),
      userInfo: getCachedUserInfo(),
      allAuthKeys: Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.includes('supabase') || 
        key.includes('auth')
      )
    });
    
    if (cachedSession) {
      try {
        const sessionData = JSON.parse(cachedSession);
        console.log('📄 Session Data:', {
          hasAccessToken: !!sessionData?.access_token,
          hasRefreshToken: !!sessionData?.refresh_token,
          expiresAt: sessionData?.expires_at ? new Date(sessionData.expires_at * 1000).toLocaleString() : 'Not set',
          userEmail: sessionData?.user?.email
        });
      } catch {
        console.log('❌ Invalid session data format');
      }
    }
  } catch (error) {
    console.error('❌ Error debugging auth storage:', error);
  }
}; 