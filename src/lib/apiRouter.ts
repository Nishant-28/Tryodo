import TryodoAPI from './api';

// Types for API routing
interface ApiRequest {
  method: string;
  path: string;
  query?: Record<string, any>;
  body?: any;
  params?: Record<string, string>;
}

interface ApiRoute {
  method: string;
  path: string;
  handler: (req: ApiRequest) => Promise<any>;
}

/**
 * API Router for Tryodo Marketplace
 * This provides REST-like endpoints that can be exposed via your preferred method
 */
export class ApiRouter {
  private routes: ApiRoute[] = [];

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check
    this.addRoute('GET', '/health', this.handleHealthCheck);
    this.addRoute('GET', '/info', this.handleApiInfo);

    // Brands
    this.addRoute('GET', '/brands', this.handleGetBrands);
    this.addRoute('GET', '/brands/:id', this.handleGetBrandById);

    // Smartphones
    this.addRoute('GET', '/smartphones', this.handleGetSmartphones);
    this.addRoute('GET', '/smartphones/:id', this.handleGetSmartphoneById);
    this.addRoute('GET', '/smartphones/search', this.handleSearchSmartphones);

    // Vendors
    this.addRoute('GET', '/vendors', this.handleGetVendors);
    this.addRoute('GET', '/vendors/:id', this.handleGetVendorById);
    this.addRoute('GET', '/vendors/:id/products', this.handleGetVendorProducts);

    // Categories
    this.addRoute('GET', '/categories', this.handleGetCategories);
    this.addRoute('GET', '/quality-categories', this.handleGetQualityCategories);

    // Comparison
    this.addRoute('POST', '/compare', this.handleCompareSmartphones);

    // Analytics
    this.addRoute('GET', '/analytics/popular', this.handleGetPopularSmartphones);
    this.addRoute('GET', '/analytics/stats', this.handleGetMarketStats);
  }

  private addRoute(method: string, path: string, handler: (req: ApiRequest) => Promise<any>) {
    this.routes.push({ method, path, handler: handler.bind(this) });
  }

  /**
   * Main routing function - matches request to appropriate handler
   */
  async handleRequest(req: ApiRequest): Promise<any> {
    const route = this.matchRoute(req.method, req.path);
    
    if (!route) {
      return {
        success: false,
        error: 'Endpoint not found',
        status: 404
      };
    }

    try {
      return await route.handler(req);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Internal server error',
        status: 500
      };
    }
  }

  private matchRoute(method: string, path: string): ApiRoute | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
      // Simple pattern matching for :param syntax
      const routePattern = route.path.replace(/:([^/]+)/g, '([^/]+)');
      const regex = new RegExp(`^${routePattern}$`);
      
      if (regex.test(path)) {
        return route;
      }
    }
    return null;
  }

  private extractParams(routePath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const routeParts = routePath.split('/');
    const pathParts = actualPath.split('/');

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      if (routePart.startsWith(':')) {
        const paramName = routePart.substring(1);
        params[paramName] = pathParts[i];
      }
    }

    return params;
  }

  // Route Handlers
  private async handleHealthCheck(req: ApiRequest) {
    return await TryodoAPI.healthCheck();
  }

  private async handleApiInfo(req: ApiRequest) {
    return TryodoAPI.getAPIInfo();
  }

  private async handleGetBrands(req: ApiRequest) {
    return await TryodoAPI.Brand.getAllBrands();
  }

  private async handleGetBrandById(req: ApiRequest) {
    const params = this.extractParams('/brands/:id', req.path);
    const id = params.id;

    if (!id) {
      return {
        success: false,
        error: 'Brand ID is required',
        status: 400
      };
    }

    return await TryodoAPI.Brand.getBrandById(id);
  }

  private async handleGetSmartphones(req: ApiRequest) {
    const filters = {
      brand_id: req.query?.brand_id,
      category_id: req.query?.category_id,
      min_price: req.query?.min_price ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query?.max_price ? parseFloat(req.query.max_price) : undefined,
      quality_type: req.query?.quality_type,
      search: req.query?.search,
      is_active: req.query?.is_active !== undefined ? req.query.is_active === 'true' : undefined
    };

    const pagination = {
      page: req.query?.page ? parseInt(req.query.page) : undefined,
      limit: req.query?.limit ? parseInt(req.query.limit) : undefined
    };

    return await TryodoAPI.Smartphone.getSmartphones(filters, pagination);
  }

  private async handleGetSmartphoneById(req: ApiRequest) {
    const params = this.extractParams('/smartphones/:id', req.path);
    const id = params.id;

    if (!id) {
      return {
        success: false,
        error: 'Smartphone ID is required',
        status: 400
      };
    }

    return await TryodoAPI.Smartphone.getSmartphoneById(id);
  }

  private async handleSearchSmartphones(req: ApiRequest) {
    const keyword = req.query?.q || req.query?.keyword;

    if (!keyword) {
      return {
        success: false,
        error: 'Search keyword is required (use ?q=keyword)',
        status: 400
      };
    }

    const pagination = {
      page: req.query?.page ? parseInt(req.query.page) : undefined,
      limit: req.query?.limit ? parseInt(req.query.limit) : undefined
    };

    return await TryodoAPI.Smartphone.searchSmartphones(keyword, pagination);
  }

  private async handleGetVendors(req: ApiRequest) {
    const pagination = {
      page: req.query?.page ? parseInt(req.query.page) : undefined,
      limit: req.query?.limit ? parseInt(req.query.limit) : undefined
    };

    return await TryodoAPI.Vendor.getVerifiedVendors(pagination);
  }

  private async handleGetVendorById(req: ApiRequest) {
    const params = this.extractParams('/vendors/:id', req.path);
    const id = params.id;

    if (!id) {
      return {
        success: false,
        error: 'Vendor ID is required',
        status: 400
      };
    }

    return await TryodoAPI.Vendor.getVendorById(id);
  }

  private async handleGetVendorProducts(req: ApiRequest) {
    const params = this.extractParams('/vendors/:id/products', req.path);
    const vendorId = params.id;

    if (!vendorId) {
      return {
        success: false,
        error: 'Vendor ID is required',
        status: 400
      };
    }

    const filters = {
      category_id: req.query?.category_id,
      min_price: req.query?.min_price ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query?.max_price ? parseFloat(req.query.max_price) : undefined,
      quality_type: req.query?.quality_type
    };

    const pagination = {
      page: req.query?.page ? parseInt(req.query.page) : undefined,
      limit: req.query?.limit ? parseInt(req.query.limit) : undefined
    };

    return await TryodoAPI.Vendor.getVendorProducts(vendorId, filters, pagination);
  }

  private async handleGetCategories(req: ApiRequest) {
    return await TryodoAPI.Category.getAllCategories();
  }

  private async handleGetQualityCategories(req: ApiRequest) {
    return await TryodoAPI.Category.getQualityCategories();
  }

  private async handleCompareSmartphones(req: ApiRequest) {
    const { ids } = req.body || {};

    if (!ids || !Array.isArray(ids)) {
      return {
        success: false,
        error: 'Request body must contain an "ids" array of smartphone IDs',
        status: 400
      };
    }

    return await TryodoAPI.Comparison.compareSmartphones(ids);
  }

  private async handleGetPopularSmartphones(req: ApiRequest) {
    const limit = req.query?.limit ? parseInt(req.query.limit) : undefined;
    return await TryodoAPI.Analytics.getPopularSmartphones(limit);
  }

  private async handleGetMarketStats(req: ApiRequest) {
    return await TryodoAPI.Analytics.getMarketStats();
  }

  /**
   * Get all available routes for documentation
   */
  getRoutes(): ApiRoute[] {
    return this.routes.map(route => ({
      method: route.method,
      path: route.path,
      handler: route.handler
    }));
  }
}

// Express.js integration helper
export const createExpressHandler = (router: ApiRouter) => {
  return async (req: any, res: any) => {
    const apiRequest: ApiRequest = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      params: req.params
    };

    try {
      const result = await router.handleRequest(apiRequest);
      const status = result.status || (result.success ? 200 : 400);
      res.status(status).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  };
};

// Fetch API integration helper (for Vercel, Netlify, etc.)
export const createFetchHandler = (router: ApiRouter) => {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname.replace('/api', ''); // Remove /api prefix if present
    
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.json();
      } catch {
        // Body might not be JSON, that's okay
      }
    }

    const query: Record<string, any> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const apiRequest: ApiRequest = {
      method,
      path,
      query,
      body
    };

    try {
      const result = await router.handleRequest(apiRequest);
      const status = result.status || (result.success ? 200 : 400);
      
      return new Response(JSON.stringify(result), {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  };
};

// Default router instance
export const apiRouter = new ApiRouter();

export default ApiRouter; 