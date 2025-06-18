import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  hasValidCachedSession,
  getCachedUserInfo,
  clearExpiredSession,
  debugAuthStorage
} from '../lib/authUtils';
import { toast } from 'sonner';

export type UserRole = 'customer' | 'vendor' | 'admin' | 'delivery_boy';

export interface Profile {
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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

  // Fetch profile data for the current user
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Check session and initialize auth state
  const initializeAuth = async () => {
    try {
      // Clear any expired sessions first
      clearExpiredSession();
      
      // Check for valid cached session to speed up loading
      if (hasValidCachedSession()) {
        const cachedUserInfo = getCachedUserInfo();
        if (cachedUserInfo) {
          // Fast path for cached valid session
          setLoading(false);
          setInitialCheckComplete(true);
        }
      }

      // Get current session from Supabase
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Fetch profile data
        const profileData = await fetchProfile(currentSession.user.id);
        setProfile(profileData);
      } else {
        // No active session
        setSession(null);
        setUser(null);
        setProfile(null);
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear any corrupted data
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
      setInitialCheckComplete(true);
    }
  };

  // Set up auth state listener
  useEffect(() => {
    // Initialize auth state
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            setSession(session);
            setUser(session.user);
            
            // Fetch profile for signed-in user
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        } catch (error) {
          console.error('Auth state change error:', error);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to sign in' 
        };
      }

      if (data.user) {
        // Profile will be loaded automatically by the auth state change listener
        return { success: true };
      }

      return { success: false, error: 'Authentication failed' };

    } catch (error: any) {
      console.error('Unexpected sign in error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to create account' 
        };
      }

      if (data.user) {
        // Create profile
        const profile = await createProfile(data.user, fullName, role);
        if (profile) {
          setProfile(profile);
        }
        
        return { 
          success: true, 
          error: 'Please check your email to verify your account before signing in.' 
        };
      }

      return { success: false, error: 'Failed to create account' };

    } catch (error: any) {
      console.error('Unexpected sign up error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      // State will be cleared by the auth state change listener
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Unexpected password reset error:', error);
      return { success: false, error: error.message || 'Failed to send reset email' };
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
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
      return { success: true };
    } catch (error: any) {
      console.error('Unexpected profile update error:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

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
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
