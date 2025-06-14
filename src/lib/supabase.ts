import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 Supabase configuration missing!', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined',
  });
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

// Extend Window interface for development debug functions
declare global {
  interface Window {
    debugAuthState?: () => Promise<void>;
    clearAuthStorage?: () => void;
    forceAuthReset?: () => Promise<void>;
  }
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          role: 'customer' | 'vendor' | 'admin';
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          role: 'customer' | 'vendor' | 'admin';
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          role?: 'customer' | 'vendor' | 'admin';
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      brands: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      smartphone_models: {
        Row: {
          id: string;
          brand_id: string;
          model_name: string;
          model_number: string | null;
          release_year: number | null;
          base_price: number | null;
          specifications: any | null;
          official_images: string[] | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          model_name: string;
          model_number?: string | null;
          release_year?: number | null;
          base_price?: number | null;
          specifications?: any | null;
          official_images?: string[] | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          model_name?: string;
          model_number?: string | null;
          release_year?: number | null;
          base_price?: number | null;
          specifications?: any | null;
          official_images?: string[] | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          gradient: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          gradient?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          gradient?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      quality_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      category_qualities: {
        Row: {
          id: string;
          category_id: string;
          quality_name: string;
          quality_description: string | null;
          specifications: any | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          quality_name: string;
          quality_description?: string | null;
          specifications?: any | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          quality_name?: string;
          quality_description?: string | null;
          specifications?: any | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      model_category_qualities: {
        Row: {
          id: string;
          smartphone_model_id: string;
          category_id: string;
          category_quality_id: string;
          additional_specs: any | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          smartphone_model_id: string;
          category_id: string;
          category_quality_id: string;
          additional_specs?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          smartphone_model_id?: string;
          category_id?: string;
          category_quality_id?: string;
          additional_specs?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      generic_products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          profile_id: string;
          business_name: string;
          business_registration: string | null;
          gstin: string | null;
          business_address: string | null;
          business_city: string | null;
          business_state: string | null;
          business_pincode: string | null;
          contact_person: string | null;
          contact_phone: string | null;
          business_email: string | null;
          website_url: string | null;
          rating: number;
          total_reviews: number;
          total_sales: number;
          response_time_hours: number;
          shipping_policy: string | null;
          return_policy: string | null;
          is_verified: boolean;
          is_active: boolean;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          business_name: string;
          business_registration?: string | null;
          gstin?: string | null;
          business_address?: string | null;
          business_city?: string | null;
          business_state?: string | null;
          business_pincode?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          business_email?: string | null;
          website_url?: string | null;
          rating?: number;
          total_reviews?: number;
          total_sales?: number;
          response_time_hours?: number;
          shipping_policy?: string | null;
          return_policy?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          business_name?: string;
          business_registration?: string | null;
          gstin?: string | null;
          business_address?: string | null;
          business_city?: string | null;
          business_state?: string | null;
          business_pincode?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          business_email?: string | null;
          website_url?: string | null;
          rating?: number;
          total_reviews?: number;
          total_sales?: number;
          response_time_hours?: number;
          shipping_policy?: string | null;
          return_policy?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendor_products: {
        Row: {
          id: string;
          vendor_id: string;
          model_id: string;
          category_id: string;
          quality_type_id: string;
          price: number;
          original_price: number | null;
          warranty_months: number;
          stock_quantity: number;
          is_in_stock: boolean;
          delivery_time_days: number;
          product_images: string[] | null;
          specifications: any | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          model_id: string;
          category_id: string;
          quality_type_id: string;
          price: number;
          original_price?: number | null;
          warranty_months?: number;
          stock_quantity?: number;
          delivery_time_days?: number;
          product_images?: string[] | null;
          specifications?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          model_id?: string;
          category_id?: string;
          quality_type_id?: string;
          price?: number;
          original_price?: number | null;
          warranty_months?: number;
          stock_quantity?: number;
          delivery_time_days?: number;
          product_images?: string[] | null;
          specifications?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendor_generic_products: {
        Row: {
          id: string;
          vendor_id: string;
          generic_product_id: string;
          quality_type_id: string;
          price: number;
          original_price: number | null;
          warranty_months: number;
          stock_quantity: number;
          is_in_stock: boolean;
          delivery_time_days: number;
          product_images: string[] | null;
          specifications: any | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          generic_product_id: string;
          quality_type_id: string;
          price: number;
          original_price?: number | null;
          warranty_months?: number;
          stock_quantity?: number;
          delivery_time_days?: number;
          product_images?: string[] | null;
          specifications?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          generic_product_id?: string;
          quality_type_id?: string;
          price?: number;
          original_price?: number | null;
          warranty_months?: number;
          stock_quantity?: number;
          delivery_time_days?: number;
          product_images?: string[] | null;
          specifications?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Create Supabase client with proper auth configuration for session persistence
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure sessions persist across page refreshes and browser restarts
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Additional options for better session management
    storageKey: 'tryodo-auth-token',
    flowType: 'pkce',
  },
  // Add global configuration for better connection handling
  global: {
    headers: {
      'x-client-info': 'tryodo-website@1.0.0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Utility function to clear all auth-related storage
export const clearAuthStorage = () => {
  console.log('🧹 Clearing all auth storage...');
  
  try {
    // Clear localStorage items related to Supabase auth
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key === 'tryodo-auth-token') {
        console.log(`🗑️ Removing localStorage key: ${key}`);
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage items related to Supabase auth
    const sessionStorageKeys = Object.keys(sessionStorage);
    sessionStorageKeys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
        console.log(`🗑️ Removing sessionStorage key: ${key}`);
        sessionStorage.removeItem(key);
      }
    });

    console.log('✅ Auth storage cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing auth storage:', error);
  }
};

// Utility function to manually reset auth state
export const forceAuthReset = async () => {
  console.log('🔄 Force resetting auth state...');
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all storage
    clearAuthStorage();
    
    // Refresh the page to ensure clean state
    window.location.href = '/login';
  } catch (error) {
    console.error('❌ Error force resetting auth:', error);
  }
};

// Debug function to check current auth state
export const debugAuthState = async () => {
  console.log('🔍 Debug: Checking auth state...');
  
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('📊 Current Auth State:', {
      hasSession: !!session,
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id,
      sessionExpiry: session?.expires_at,
      sessionError,
      userError,
    });
    
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      console.log('👤 User Profile:', profile);
      console.log('🔍 Profile Error:', profileError);
    }
    
    // Check localStorage for auth tokens
    const authKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')
    );
    console.log('💾 Auth Keys in localStorage:', authKeys);
    
  } catch (error) {
    console.error('❌ Error debugging auth state:', error);
  }
};

// Test database connection
export const testDbConnection = async () => {
  console.log('🔍 Testing database connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    console.log('✅ Database connection test result:', { data, error });
    return { success: !error, data, error };
  } catch (err) {
    console.error('❌ Database connection test failed:', err);
    return { success: false, error: err };
  }
};

// Make debug function available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.debugAuthState = debugAuthState;
  window.clearAuthStorage = clearAuthStorage;
  window.forceAuthReset = forceAuthReset;
  (window as any).testDbConnection = testDbConnection;
}