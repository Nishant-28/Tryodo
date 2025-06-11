import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
      models: {
        Row: {
          id: string;
          brand_id: string;
          name: string;
          full_name: string;
          release_year: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          name: string;
          full_name: string;
          release_year?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          name?: string;
          full_name?: string;
          release_year?: number | null;
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
      quality_types: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
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
          specifications: any | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          specifications?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          specifications?: any | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          user_id: string | null;
          business_name: string;
          contact_person: string | null;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          gstin: string | null;
          rating: number;
          total_reviews: number;
          response_time_hours: number;
          is_verified: boolean;
          is_active: boolean;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_name: string;
          contact_person?: string | null;
          email: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          gstin?: string | null;
          rating?: number;
          total_reviews?: number;
          response_time_hours?: number;
          is_verified?: boolean;
          is_active?: boolean;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          business_name?: string;
          contact_person?: string | null;
          email?: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          gstin?: string | null;
          rating?: number;
          total_reviews?: number;
          response_time_hours?: number;
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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);