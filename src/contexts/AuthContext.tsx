import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { hasValidCachedSession, getCachedUserInfo, clearExpiredSession, debugAuthStorage } from '@/lib/authUtils';
import { toast } from 'sonner';

export type UserRole = 'customer' | 'vendor' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Make debug function available globally for console debugging
(window as any).debugAuthStorage = debugAuthStorage;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Create profile after signup or as fallback
  const createProfile = async (user: User, fullName: string, role: UserRole): Promise<Profile | null> => {
    try {
      const profileData = {
        user_id: user.id,
        email: user.email!,
        role,
        full_name: fullName,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createProfile:', error);
      return null;
    }
  };

  // Fetch user profile with retry logic and fallback creation
  const fetchProfile = async (userId: string, retries = 3): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile not found and we have retries left, try creating one
        if (error.code === 'PGRST116' && retries > 0) {
          // Get user data from Supabase auth
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (user && !userError) {
            // Extract role and name from user metadata or default values
            const userRole = user.user_metadata?.role || 'customer';
            const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
            
            const createdProfile = await createProfile(user, userName, userRole as UserRole);
            if (createdProfile) {
              return createdProfile;
            }
          }
          
          // Retry fetching after a short delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retries - 1);
        }
        
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Update auth state (shared logic)
  const updateAuthState = async (currentUser: User | null, currentSession: Session | null) => {
    if (currentUser && currentSession) {
      const userProfile = await fetchProfile(currentUser.id);
      if (userProfile) {
        setUser(currentUser);
        setProfile(userProfile);
        setSession(currentSession);
        return true;
      } else {
        await supabase.auth.signOut();
        return false;
      }
    } else {
      setUser(null);
      setProfile(null);
      setSession(null);
      return false;
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        const success = await updateAuthState(data.user, data.session);
        if (success) {
          toast.success(`Welcome back, ${profile?.full_name || 'User'}!`);
          return { success: true };
        } else {
          return { success: false, error: 'Unable to load user profile. Please try signing up again or contact support.' };
        }
      }

      return { success: false, error: 'Sign in failed. Please try again.' };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, fullName: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Create profile in database
        const userProfile = await createProfile(data.user, fullName, role);
        
        if (!userProfile) {
          return { success: false, error: 'Failed to create user profile. Please try again.' };
        }

        // If email confirmation is not required, set user data immediately
        if (data.session) {
          setUser(data.user);
          setProfile(userProfile);
          setSession(data.session);
          toast.success(`Welcome to Tryodo, ${fullName}!`);
        } else {
          toast.success('Please check your email to confirm your account!');
        }

        return { success: true };
      }

      return { success: false, error: 'Sign up failed. Please try again.' };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected password reset error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  // Update profile function
  const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || !profile) {
        return { success: false, error: 'No user logged in' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        return { success: false, error: error.message };
      }

      setProfile(data);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      console.error('Unexpected profile update error:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Clear any expired sessions first
        clearExpiredSession();
        
        // Check for valid cached session to speed up loading
        if (hasValidCachedSession()) {
          const cachedUserInfo = getCachedUserInfo();
        }
        
        // Get session from Supabase
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (sessionError) {
          console.error('Session error:', sessionError);
          setLoading(false);
          setInitialCheckComplete(true);
          return;
        }

        if (initialSession?.user) {
          await updateAuthState(initialSession.user, initialSession);
        } else {
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialCheckComplete(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      try {
        // Don't set loading for token refresh to avoid UI flicker
        if (event !== 'TOKEN_REFRESHED') {
          setLoading(true);
        }

        if (event === 'SIGNED_IN' && currentSession?.user) {
          if (initialCheckComplete) {
            await updateAuthState(currentSession.user, currentSession);
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setSession(null);
          }
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          if (isMounted) {
            setSession(currentSession);
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        if (isMounted && event !== 'TOKEN_REFRESHED') {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
