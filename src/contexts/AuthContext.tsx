import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'customer' | 'vendor' | 'admin';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, role: UserRole, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        console.log('Initial session:', session);

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('User found, fetching profile for user ID:', session.user.id);
            await fetchUserProfile(session.user.id);
          } else {
            console.log('No user found');
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state changed:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('Auth changed - fetching profile for user ID:', session.user.id);
        await fetchUserProfile(session.user.id);
      } else {
        console.log('Auth changed - no user, clearing profile');
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user ID:', userId);
      
      // First, let's check if the profiles table exists by trying to fetch
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('Profile fetch result:', { data, error });

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create a default customer profile
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating default customer profile...');
          
          const user = await supabase.auth.getUser();
          if (user.data.user) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                user_id: userId,
                email: user.data.user.email!,
                role: 'customer' as UserRole,
                full_name: null,
              })
              .select()
              .single();

            if (createError) {
              console.error('Error creating profile:', createError);
              setProfile(null);
            } else {
              console.log('Profile created successfully:', newProfile);
              setProfile(newProfile);
            }
          }
        } else {
          setProfile(null);
        }
      } else {
        console.log('Profile loaded successfully:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('Attempting sign in for:', email, 'as role:', role);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth sign in error:', error);
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('User signed in successfully:', data.user.id);
        
        // The profile will be fetched automatically by the auth state change listener
        // But let's also verify the role here
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        console.log('Profile verification result:', { profileData, profileError });

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it with the selected role
          console.log('Creating profile with role:', role);
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: data.user.id,
              email: data.user.email!,
              role,
              full_name: null,
            });

          if (createError) {
            console.error('Error creating profile during sign in:', createError);
            await supabase.auth.signOut();
            setLoading(false);
            return { success: false, error: 'Failed to create user profile.' };
          }
        } else if (profileError) {
          console.error('Error fetching profile during sign in:', profileError);
          await supabase.auth.signOut();
          setLoading(false);
          return { success: false, error: 'User profile not found. Please contact support.' };
        } else if (profileData && profileData.role !== role) {
          console.error('Role mismatch:', profileData.role, 'vs', role);
          await supabase.auth.signOut();
          setLoading(false);
          return { success: false, error: `Access denied. This account is not registered as a ${role}.` };
        }

        console.log('Sign in successful with matching role');
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error) {
      console.error('Sign in catch error:', error);
      setLoading(false);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  };

  const signUp = async (email: string, password: string, role: UserRole, fullName?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('Attempting sign up for:', email, 'as role:', role);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Auth sign up error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('User created successfully:', data.user.id);
        
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: data.user.email!,
            role,
            full_name: fullName || null,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          return { success: false, error: 'Failed to create user profile. Please try again.' };
        }

        console.log('Profile created successfully');
        return { success: true };
      }

      return { success: false, error: 'Registration failed. Please try again.' };
    } catch (error) {
      console.error('Sign up catch error:', error);
      return { success: false, error: 'An unexpected error occurred.' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return profile?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return profile ? roles.includes(profile.role) : false;
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 