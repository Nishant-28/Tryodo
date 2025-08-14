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

export type UserRole = 'customer' | 'vendor' | 'admin' | 'delivery_partner';

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
  date_of_birth: string | null;
  gender: string | null;
  avatar_url: string | null;
  notification_preferences: any | null;
  privacy_settings: any | null;
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
  refreshSession: () => Promise<void>;
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

  // Fetch profile data using the new database function
  const fetchProfile = async (userId: string, retryCount = 0): Promise<Profile | null> => {
    try {
      console.log('🔍 Fetching profile for userId:', userId, 'retry:', retryCount);
      
      // Get current session to ensure we have auth context
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('⚠️ No active session found, cannot fetch profile');
        return null;
      }
      
      // Fetch profile directly from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          console.log('ℹ️ No profile found for user');
          
          // If no profile found and we have user metadata, try to create one
          if (session?.user?.user_metadata?.role && retryCount < 2) {
            console.log('🔧 Attempting to create missing profile...');
            
            const { createMissingProfile } = await import('../lib/profileUtils');
            const result = await createMissingProfile(
              userId,
              session.user.email || '',
              session.user.user_metadata.role,
              session.user.user_metadata.full_name
            );
            
            if (result.success) {
              console.log('✅ Profile created, retrying fetch...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              return fetchProfile(userId, retryCount + 1);
            } else {
              console.error('❌ Failed to create profile:', result.error);
            }
          }
          
          return null;
        } else {
          console.error('❌ Error fetching profile:', error);
          
          // If we get an RLS error and it's the first try, wait a bit for profile creation
          if (error.code === '42501' || error.message?.includes('RLS') || error.message?.includes('permission')) {
            if (retryCount < 3) {
              console.log('🔄 RLS error detected, retrying in 1 second...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              return fetchProfile(userId, retryCount + 1);
            }
          }
          
          return null;
        }
      }

      console.log('✅ Profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in fetchProfile:', error);
      
      // Retry on network errors
      if (retryCount < 2 && (error instanceof Error && (error.message.includes('network') || error.message.includes('fetch')))) {
        console.log('🔄 Network error, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchProfile(userId, retryCount + 1);
      }
      
      return null;
    }
  };

  // Refresh session manually
  const refreshSession = async (): Promise<void> => {
    try {
      console.log('🔄 Manually refreshing session...');
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh error:', error);
        // If refresh fails, clear auth state
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }

      if (newSession) {
        console.log('✅ Session refreshed successfully');
        setSession(newSession);
        setUser(newSession.user);
        
        // Refresh profile too
        if (newSession.user) {
          const profileData = await fetchProfile(newSession.user.id);
          setProfile(profileData);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
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
          console.log('⚡ Using cached session info');
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
        console.log('✅ Active session found for user:', currentSession.user.email);
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Fetch profile data
        const profileData = await fetchProfile(currentSession.user.id);
        setProfile(profileData);
        
        if (!profileData) {
          console.warn('⚠️ User has session but no profile found');
        }
      } else {
        console.log('ℹ️ No active session');
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
          console.log('🔄 Auth state change:', { event, hasUser: !!session?.user });
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ User signed in:', session.user.email);
            setSession(session);
            setUser(session.user);
            
            // Fetch profile for signed-in user with some delay to allow trigger to complete
            setTimeout(async () => {
              console.log('👤 Fetching profile for user:', session.user.id);
              const profileData = await fetchProfile(session.user.id);
              console.log('👤 Profile data:', profileData);
              setProfile(profileData);
              
              if (!profileData) {
                console.error('❌ No profile found after sign in');
              }
            }, 1000);
            
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 User signed out');
            setSession(null);
            setUser(null);
            setProfile(null);
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('🔄 Token refreshed for user:', session.user.email);
            setSession(session);
            setUser(session.user);
            // Profile should remain the same, no need to refetch
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Set up automatic session refresh
  useEffect(() => {
    if (!session?.expires_at) return;

    const expiryTime = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();
    
    // Refresh 5 minutes before expiry
    const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000));
    
    console.log(`⏰ Setting up auto-refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
    
    const refreshTimer = setTimeout(() => {
      console.log('⏰ Auto-refreshing session...');
      refreshSession();
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [session?.expires_at]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 AuthContext: Starting sign in process for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔐 AuthContext: Supabase response:', { 
        hasUser: !!data.user, 
        hasSession: !!data.session,
        error: error?.message 
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        
        // Provide user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many sign in attempts. Please wait a moment and try again.';
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }

      if (data.user && data.session) {
        console.log('✅ User authenticated successfully');
        // Profile will be loaded automatically by the auth state change listener
        return { success: true };
      }

      console.error('❌ No user or session returned from Supabase');
      return { success: false, error: 'Authentication failed. Please try again.' };

    } catch (error: any) {
      console.error('❌ Unexpected sign in error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred. Please try again.' 
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
      console.log('📝 AuthContext: Starting sign up process for:', email, 'with role:', role);
      
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
        console.error('❌ Sign up error:', error);
        
        // Provide user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Password must be at least 6 characters long.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        }
        
        return { 
          success: false, 
          error: errorMessage
        };
      }

      if (data.user) {
        console.log('✅ User created successfully:', data.user.email);
        
        // Check if email confirmation is required
        if (!data.session) {
          return {
            success: true,
            error: 'Please check your email and click the confirmation link to complete your registration.'
          };
        }
        
        // Try to ensure profile exists (fallback for missing trigger)
        if (data.session && data.user) {
          console.log('🔧 Ensuring profile exists for new user...');
          try {
            // Wait a moment for any trigger to fire
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if profile was created
            const { data: profileCheck } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', data.user.id)
              .single();
            
            if (!profileCheck) {
              console.log('⚠️ Profile not found, attempting to create it...');
              
              // Try to create the profile manually
              const { createMissingProfile } = await import('../lib/profileUtils');
              const result = await createMissingProfile(
                data.user.id,
                email,
                role,
                fullName
              );
              
              if (result.success) {
                console.log('✅ Profile created successfully via fallback');
              } else {
                console.warn('⚠️ Profile creation fallback failed:', result.error);
                // Don't fail the signup, just warn
              }
            } else {
              console.log('✅ Profile already exists');
            }
          } catch (profileError) {
            console.warn('⚠️ Profile creation check failed:', profileError);
            // Don't fail the signup for profile issues
          }
        }
        
        // Profile will be created automatically by the database trigger
        return { success: true };
      }

      return { success: false, error: 'Failed to create account. Please try again.' };

    } catch (error: any) {
      console.error('❌ Unexpected sign up error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred during sign up.' 
      };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Signing out user');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      } else {
        console.log('✅ Sign out successful');
      }
    } catch (error) {
      console.error('❌ Unexpected sign out error:', error);
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔄 Sending password reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to send reset email'
        };
      }

      console.log('✅ Password reset email sent');
      return { success: true };

    } catch (error: any) {
      console.error('❌ Unexpected password reset error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      };
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || !profile) {
        return { success: false, error: 'No user logged in' };
      }

      console.log('📝 Updating profile:', updates);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Profile update error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to update profile'
        };
      }

      console.log('✅ Profile updated successfully');
      setProfile(data);
      return { success: true };

    } catch (error: any) {
      console.error('❌ Unexpected profile update error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      };
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      console.log('🔄 Refreshing profile for user:', user.id);
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
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
