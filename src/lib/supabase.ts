import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
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
          role: 'customer' | 'vendor' | 'admin' | 'delivery_boy';
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          role: 'customer' | 'vendor' | 'admin' | 'delivery_boy';
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          role?: 'customer' | 'vendor' | 'admin' | 'delivery_boy';
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
      customers: {
        Row: {
          id: string;
          profile_id: string;
          date_of_birth: string | null;
          gender: string | null;
          total_orders: number;
          total_spent: number;
          last_order_date: string | null;
          preferred_delivery_address: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          date_of_birth?: string | null;
          gender?: string | null;
          total_orders?: number;
          total_spent?: number;
          last_order_date?: string | null;
          preferred_delivery_address?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          date_of_birth?: string | null;
          gender?: string | null;
          total_orders?: number;
          total_spent?: number;
          last_order_date?: string | null;
          preferred_delivery_address?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_partners: {
        Row: {
          id: string;
          profile_id: string;
          license_number: string;
          vehicle_type: string;
          vehicle_number: string;
          aadhar_number: string;
          pan_number: string | null;
          bank_account_number: string | null;
          bank_ifsc_code: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          current_latitude: number | null;
          current_longitude: number | null;
          assigned_pincodes: string[];
          is_available: boolean;
          is_active: boolean;
          is_verified: boolean;
          rating: number;
          total_reviews: number;
          total_deliveries: number;
          successful_deliveries: number;
          cancelled_deliveries: number;
          average_delivery_time_minutes: number;
          joined_at: string;
          last_location_update: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          license_number: string;
          vehicle_type: string;
          vehicle_number: string;
          aadhar_number: string;
          pan_number?: string | null;
          bank_account_number?: string | null;
          bank_ifsc_code?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          assigned_pincodes?: string[];
          is_available?: boolean;
          is_active?: boolean;
          is_verified?: boolean;
          rating?: number;
          total_reviews?: number;
          total_deliveries?: number;
          successful_deliveries?: number;
          cancelled_deliveries?: number;
          average_delivery_time_minutes?: number;
          joined_at?: string;
          last_location_update?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          license_number?: string;
          vehicle_type?: string;
          vehicle_number?: string;
          aadhar_number?: string;
          pan_number?: string | null;
          bank_account_number?: string | null;
          bank_ifsc_code?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          current_latitude?: number | null;
          current_longitude?: number | null;
          assigned_pincodes?: string[];
          is_available?: boolean;
          is_active?: boolean;
          is_verified?: boolean;
          rating?: number;
          total_reviews?: number;
          total_deliveries?: number;
          successful_deliveries?: number;
          cancelled_deliveries?: number;
          average_delivery_time_minutes?: number;
          joined_at?: string;
          last_location_update?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          delivery_address: any;
          subtotal: number;
          shipping_charges: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          order_status: string;
          payment_status: string;
          payment_method: string | null;
          payment_id: string | null;
          estimated_delivery_date: string | null;
          actual_delivery_date: string | null;
          delivery_instructions: string | null;
          preferred_delivery_time: string | null;
          delivery_attempts: number;
          last_delivery_attempt: string | null;
          special_instructions: string | null;
          notes: string | null;
          cancelled_date: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          customer_id: string;
          delivery_address: any;
          subtotal: number;
          shipping_charges?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount: number;
          order_status?: string;
          payment_status?: string;
          payment_method?: string | null;
          payment_id?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          delivery_instructions?: string | null;
          preferred_delivery_time?: string | null;
          delivery_attempts?: number;
          last_delivery_attempt?: string | null;
          special_instructions?: string | null;
          notes?: string | null;
          cancelled_date?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_id?: string;
          delivery_address?: any;
          subtotal?: number;
          shipping_charges?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;
          order_status?: string;
          payment_status?: string;
          payment_method?: string | null;
          payment_id?: string | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;
          delivery_instructions?: string | null;
          preferred_delivery_time?: string | null;
          delivery_attempts?: number;
          last_delivery_attempt?: string | null;
          special_instructions?: string | null;
          notes?: string | null;
          cancelled_date?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          vendor_id: string;
          vendor_product_id: string | null;
          vendor_generic_product_id: string | null;
          product_name: string;
          product_description: string | null;
          category_name: string | null;
          quality_type_name: string | null;
          unit_price: number;
          quantity: number;
          line_total: number;
          item_status: string;
          vendor_confirmed_at: string | null;
          vendor_notes: string | null;
          picked_up_at: string | null;
          pickup_confirmed_by: string | null;
          warranty_months: number;
          estimated_delivery_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          vendor_id: string;
          vendor_product_id?: string | null;
          vendor_generic_product_id?: string | null;
          product_name: string;
          product_description?: string | null;
          category_name?: string | null;
          quality_type_name?: string | null;
          unit_price: number;
          quantity?: number;
          item_status?: string;
          vendor_confirmed_at?: string | null;
          vendor_notes?: string | null;
          picked_up_at?: string | null;
          pickup_confirmed_by?: string | null;
          warranty_months?: number;
          estimated_delivery_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          vendor_id?: string;
          vendor_product_id?: string | null;
          vendor_generic_product_id?: string | null;
          product_name?: string;
          product_description?: string | null;
          category_name?: string | null;
          quality_type_name?: string | null;
          unit_price?: number;
          quantity?: number;
          item_status?: string;
          vendor_confirmed_at?: string | null;
          vendor_notes?: string | null;
          picked_up_at?: string | null;
          pickup_confirmed_by?: string | null;
          warranty_months?: number;
          estimated_delivery_days?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_partner_orders: {
        Row: {
          id: string;
          order_id: string;
          delivery_partner_id: string;
          status: string;
          pickup_otp: string;
          delivery_otp: string;
          pickup_otp_verified: boolean;
          delivery_otp_verified: boolean;
          pickup_otp_verified_at: string | null;
          delivery_otp_verified_at: string | null;
          assigned_at: string;
          accepted_at: string | null;
          pickup_started_at: string | null;
          picked_up_at: string | null;
          delivery_started_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          failed_at: string | null;
          cancellation_reason: string | null;
          failure_reason: string | null;
          delivery_fee: number;
          distance_km: number | null;
          estimated_delivery_time_minutes: number | null;
          actual_delivery_time_minutes: number | null;
          pickup_location: any | null;
          delivery_location: any | null;
          current_location: any | null;
          pickup_instructions: string | null;
          delivery_instructions: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          delivery_partner_id: string;
          status?: string;
          pickup_otp?: string;
          delivery_otp?: string;
          pickup_otp_verified?: boolean;
          delivery_otp_verified?: boolean;
          pickup_otp_verified_at?: string | null;
          delivery_otp_verified_at?: string | null;
          assigned_at?: string;
          accepted_at?: string | null;
          pickup_started_at?: string | null;
          picked_up_at?: string | null;
          delivery_started_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          failed_at?: string | null;
          cancellation_reason?: string | null;
          failure_reason?: string | null;
          delivery_fee?: number;
          distance_km?: number | null;
          estimated_delivery_time_minutes?: number | null;
          actual_delivery_time_minutes?: number | null;
          pickup_location?: any | null;
          delivery_location?: any | null;
          current_location?: any | null;
          pickup_instructions?: string | null;
          delivery_instructions?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          delivery_partner_id?: string;
          status?: string;
          pickup_otp?: string;
          delivery_otp?: string;
          pickup_otp_verified?: boolean;
          delivery_otp_verified?: boolean;
          pickup_otp_verified_at?: string | null;
          delivery_otp_verified_at?: string | null;
          assigned_at?: string;
          accepted_at?: string | null;
          pickup_started_at?: string | null;
          picked_up_at?: string | null;
          delivery_started_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          failed_at?: string | null;
          cancellation_reason?: string | null;
          failure_reason?: string | null;
          delivery_fee?: number;
          distance_km?: number | null;
          estimated_delivery_time_minutes?: number | null;
          actual_delivery_time_minutes?: number | null;
          pickup_location?: any | null;
          delivery_location?: any | null;
          current_location?: any | null;
          pickup_instructions?: string | null;
          delivery_instructions?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_partner_stats: {
        Row: {
          id: string;
          delivery_partner_id: string;
          today_deliveries: number;
          week_deliveries: number;
          month_deliveries: number;
          total_deliveries: number;
          today_earnings: number;
          week_earnings: number;
          month_earnings: number;
          total_earnings: number;
          average_rating: number;
          active_orders: number;
          last_delivery_at: string | null;
          stats_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          delivery_partner_id: string;
          today_deliveries?: number;
          week_deliveries?: number;
          month_deliveries?: number;
          total_deliveries?: number;
          today_earnings?: number;
          week_earnings?: number;
          month_earnings?: number;
          total_earnings?: number;
          average_rating?: number;
          active_orders?: number;
          last_delivery_at?: string | null;
          stats_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          delivery_partner_id?: string;
          today_deliveries?: number;
          week_deliveries?: number;
          month_deliveries?: number;
          total_deliveries?: number;
          today_earnings?: number;
          week_earnings?: number;
          month_earnings?: number;
          total_earnings?: number;
          average_rating?: number;
          active_orders?: number;
          last_delivery_at?: string | null;
          stats_date?: string;
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
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
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

// Create a service role client for administrative operations that bypass RLS
export const supabaseServiceRole = supabaseServiceRoleKey ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'x-client-info': 'tryodo-website-admin@1.0.0',
    },
  },
}) : null;

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
    // Test connection using auth endpoint which is always accessible
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Auth session error:', sessionError.message);
      return { success: false, error: `Auth error: ${sessionError.message}` };
    }
    
    // Try a simple database query to test connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);
    
    console.log('✅ Database connection test result:', { 
      success: !error, 
      hasSession: !!session,
      error: error?.message 
    });
    
    if (error) {
      // Check if it's an RLS error, which actually means connection is working
      if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
        return { 
          success: true, 
          message: 'Database connected (RLS active - this is normal)' 
        };
      }
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      message: 'Database connection successful',
      hasSession: !!session 
    };
  } catch (err) {
    console.error('❌ Database connection test failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Debug auth issues
export const debugAuthIssues = async () => {
  console.log('🔧 Starting comprehensive auth debug...');
  
  try {
    // 1. Test basic connectivity
    const dbTest = await testDbConnection();
    console.log('1️⃣ Database Test:', dbTest);
    
    // 2. Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('2️⃣ Current Session:', { 
      hasSession: !!session, 
      error: sessionError?.message,
      userId: session?.user?.id 
    });
    
    // 3. If logged in, check profile
    if (session?.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      console.log('3️⃣ Profile Check:', { 
        hasProfile: !!profileData,
        profileData: profileData,
        error: profileError?.message 
      });
      
      // 4. Check role-specific records if profile exists
      if (profileData) {
        let roleRecordExists = false;
        let roleRecordError = null;
        
        try {
          switch (profileData.role) {
            case 'customer':
              const { data: customerData } = await supabase
                .from('customers')
                .select('id')
                .eq('profile_id', profileData.id)
                .single();
              roleRecordExists = !!customerData;
              break;
            case 'vendor':
              const { data: vendorData } = await supabase
                .from('vendors')
                .select('id')
                .eq('profile_id', profileData.id)
                .single();
              roleRecordExists = !!vendorData;
              break;
            case 'delivery_partner':
              const { data: deliveryData } = await supabase
                .from('delivery_partners')
                .select('id')
                .eq('profile_id', profileData.id)
                .single();
              roleRecordExists = !!deliveryData;
              break;
            default:
              roleRecordExists = true; // Admin doesn't need role-specific records
          }
        } catch (err: any) {
          roleRecordError = err.message;
        }
        
        console.log('4️⃣ Role Record Check:', { 
          role: profileData.role,
          roleRecordExists,
          error: roleRecordError 
        });
      }
    }
    
    return { success: true, message: 'Debug completed - check console for details' };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Create a test account for debugging
export const createDebugAccount = async (role: 'customer' | 'vendor' | 'delivery_partner' = 'customer') => {
  console.log('🧪 Creating debug account with role:', role);
  
  const testEmail = `debug-${role}-${Date.now()}@tryodo.test`;
  const testPassword = 'debug123456';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: `Debug ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          role: role,
        }
      }
    });
    
    if (error) {
      console.error('❌ Debug account creation failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Debug account created:', testEmail);
    return { 
      success: true, 
      email: testEmail, 
      password: testPassword,
      user: data.user 
    };
    
  } catch (error) {
    console.error('❌ Debug account creation failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Make debug function available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.debugAuthState = debugAuthState;
  window.clearAuthStorage = clearAuthStorage;
  window.forceAuthReset = forceAuthReset;
  (window as any).testDbConnection = testDbConnection;
  (window as any).debugAuthIssues = debugAuthIssues;
  (window as any).createDebugAccount = createDebugAccount;
}

// Type definitions for delivery tables
// The previous standalone DeliveryBoy and DeliveryAssignment interfaces have been integrated
// directly into the `Database` interface above for better type inference with Supabase client.
// They are removed from here to avoid redundancy.

export default supabase;