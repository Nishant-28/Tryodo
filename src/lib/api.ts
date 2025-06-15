import { supabase } from './supabase';

// Types for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  brand_id?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  quality_type?: string;
  search?: string;
  is_active?: boolean;
}

// Brand-related API functions
export class BrandAPI {
  /**
   * Get all active brands
   */
  static async getAllBrands(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Brands retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch brands'
      };
    }
  }

  /**
   * Get brand by ID
   */
  static async getBrandById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Brand retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch brand'
      };
    }
  }
}

// Smartphone Models API
export class SmartphoneAPI {
  /**
   * Get all smartphone models with filters and pagination
   */
  static async getSmartphones(
    filters: FilterParams = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            id,
            name,
            logo_url
          )
        `)
        .eq('is_active', true);

      // Apply filters
      if (filters.brand_id) {
        query = query.eq('brand_id', filters.brand_id);
      }

      if (filters.search) {
        query = query.or(`model_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1).order('model_name');

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Retrieved ${data?.length || 0} smartphones`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch smartphones'
      };
    }
  }

  /**
   * Get smartphone model by ID with all vendor listings
   */
  static async getSmartphoneById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            id,
            name,
            logo_url
          ),
          vendor_products (
            id,
            price,
            original_price,
            warranty_months,
            stock_quantity,
            is_in_stock,
            delivery_time_days,
            product_images,
            specifications,
            vendors (
              id,
              business_name,
              rating,
              total_reviews,
              is_verified
            ),
            categories (
              id,
              name,
              description
            ),
            quality_categories (
              id,
              name,
              description
            )
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Smartphone details retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch smartphone details'
      };
    }
  }

  /**
   * Search smartphones by keyword
   */
  static async searchSmartphones(
    keyword: string,
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            id,
            name,
            logo_url
          )
        `)
        .or(`model_name.ilike.%${keyword}%,description.ilike.%${keyword}%`)
        .eq('is_active', true)
        .range(offset, offset + limit - 1)
        .order('model_name');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: `Found ${data?.length || 0} smartphones matching "${keyword}"`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search smartphones'
      };
    }
  }
}

// Vendor API
export class VendorAPI {
  /**
   * Get all verified vendors
   */
  static async getVerifiedVendors(pagination: PaginationParams = {}): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          rating,
          total_reviews,
          total_sales,
          response_time_hours,
          is_verified,
          joined_at,
          profiles (
            full_name,
            email
          )
        `)
        .eq('is_verified', true)
        .eq('is_active', true)
        .range(offset, offset + limit - 1)
        .order('rating', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Verified vendors retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendors'
      };
    }
  }

  /**
   * Get vendor by ID with their products
   */
  static async getVendorById(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          profiles (
            full_name,
            email
          ),
          vendor_products (
            id,
            price,
            original_price,
            warranty_months,
            stock_quantity,
            is_in_stock,
            delivery_time_days,
            smartphone_models (
              id,
              model_name,
              brands (
                name
              )
            ),
            categories (
              name
            ),
            quality_categories (
              name
            )
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: 'Vendor details retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendor details'
      };
    }
  }

  /**
   * Get vendor products with filters
   */
  static async getVendorProducts(
    vendorId: string,
    filters: FilterParams = {},
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<any[]>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('vendor_products')
        .select(`
          *,
          smartphone_models (
            id,
            model_name,
            brands (
              name,
              logo_url
            )
          ),
          categories (
            name
          ),
          quality_categories (
            name,
            description
          )
        `)
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      // Apply filters
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.min_price) {
        query = query.gte('price', filters.min_price);
      }

      if (filters.max_price) {
        query = query.lte('price', filters.max_price);
      }

      query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Vendor products retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch vendor products'
      };
    }
  }
}

// Categories API
export class CategoryAPI {
  /**
   * Get all active categories
   */
  static async getAllCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Categories retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch categories'
      };
    }
  }

  /**
   * Get quality categories
   */
  static async getQualityCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('quality_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Quality categories retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch quality categories'
      };
    }
  }
}

// Product Comparison API
export class ComparisonAPI {
  /**
   * Compare multiple smartphones
   */
  static async compareSmartphones(smartphoneIds: string[]): Promise<ApiResponse<any[]>> {
    try {
      if (smartphoneIds.length < 2 || smartphoneIds.length > 5) {
        return {
          success: false,
          error: 'Please provide 2-5 smartphone IDs for comparison'
        };
      }

      const { data, error } = await supabase
        .from('smartphone_models')
        .select(`
          *,
          brands (
            name,
            logo_url
          ),
          vendor_products (
            price,
            original_price,
            warranty_months,
            vendors (
              business_name,
              rating
            ),
            quality_categories (
              name
            )
          )
        `)
        .in('id', smartphoneIds)
        .eq('is_active', true);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Smartphone comparison data retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch comparison data'
      };
    }
  }
}

// Analytics API (Read-only for external applications)
export class AnalyticsAPI {
  /**
   * Get popular smartphones (most viewed)
   */
  static async getPopularSmartphones(limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('smartphone_views')
        .select(`
          smartphone_model_id,
          count,
          smartphone_models (
            id,
            model_name,
            base_price,
            brands (
              name,
              logo_url
            )
          )
        `)
        .order('count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        message: 'Popular smartphones retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch popular smartphones'
      };
    }
  }

  /**
   * Get market statistics
   */
  static async getMarketStats(): Promise<ApiResponse<any>> {
    try {
      // Get total counts
      const [brandsResult, smartphonesResult, vendorsResult] = await Promise.all([
        supabase.from('brands').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('smartphone_models').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('vendors').select('id', { count: 'exact' }).eq('is_active', true).eq('is_verified', true)
      ]);

      // Get price ranges
      const { data: priceData, error: priceError } = await supabase
        .from('vendor_products')
        .select('price')
        .eq('is_active', true);

      if (priceError) throw priceError;

      const prices = priceData?.map(p => p.price) || [];
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

      const stats = {
        total_brands: brandsResult.count || 0,
        total_smartphones: smartphonesResult.count || 0,
        total_verified_vendors: vendorsResult.count || 0,
        price_range: {
          min: minPrice,
          max: maxPrice,
          average: Math.round(avgPrice * 100) / 100
        },
        total_products: priceData?.length || 0
      };

      return {
        success: true,
        data: stats,
        message: 'Market statistics retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch market statistics'
      };
    }
  }
}

// Main API class that combines all APIs
export class TryodoAPI {
  static Brand = BrandAPI;
  static Smartphone = SmartphoneAPI;
  static Vendor = VendorAPI;
  static Category = CategoryAPI;
  static Comparison = ComparisonAPI;
  static Analytics = AnalyticsAPI;

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.from('brands').select('id').limit(1);
      
      if (error) throw error;

      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected'
        },
        message: 'Tryodo API is running smoothly'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'API health check failed'
      };
    }
  }

  /**
   * Get API version and documentation
   */
  static getAPIInfo(): ApiResponse<any> {
    return {
      success: true,
      data: {
        name: 'Tryodo Marketplace API',
        version: '1.0.0',
        description: 'RESTful API for the Tryodo smartphone marketplace',
        endpoints: {
          brands: [
            'GET /api/brands - Get all brands',
            'GET /api/brands/:id - Get brand by ID'
          ],
          smartphones: [
            'GET /api/smartphones - Get smartphones with filters',
            'GET /api/smartphones/:id - Get smartphone details',
            'GET /api/smartphones/search?q=keyword - Search smartphones'
          ],
          vendors: [
            'GET /api/vendors - Get verified vendors',
            'GET /api/vendors/:id - Get vendor details',
            'GET /api/vendors/:id/products - Get vendor products'
          ],
          categories: [
            'GET /api/categories - Get all categories',
            'GET /api/quality-categories - Get quality categories'
          ],
          comparison: [
            'POST /api/compare - Compare smartphones (body: {ids: [id1, id2, ...]})'
          ],
          analytics: [
            'GET /api/analytics/popular - Get popular smartphones',
            'GET /api/analytics/stats - Get market statistics'
          ]
        }
      },
      message: 'Tryodo API information'
    };
  }
}

export default TryodoAPI; 