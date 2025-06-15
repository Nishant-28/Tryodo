import DeliveryAPI from './deliveryApi';

// Types for Delivery API routing
interface DeliveryApiRequest {
  method: string;
  path: string;
  query?: Record<string, any>;
  body?: any;
  params?: Record<string, string>;
}

interface DeliveryApiRoute {
  method: string;
  path: string;
  handler: (req: DeliveryApiRequest) => Promise<any>;
}

/**
 * Delivery API Router for Tryodo Marketplace
 * Handles all delivery partner related endpoints
 */
export class DeliveryApiRouter {
  private routes: DeliveryApiRoute[] = [];

  constructor() {
    this.setupRoutes();
  }

  private setupRoutes() {
    // Health check
    this.addRoute('GET', '/delivery/health', this.handleHealthCheck);

    // Delivery Boy Management
    this.addRoute('GET', '/delivery/profile/:delivery_boy_id', this.handleGetProfile);
    this.addRoute('PUT', '/delivery/status/:delivery_boy_id', this.handleUpdateStatus);
    this.addRoute('POST', '/delivery/location/:delivery_boy_id', this.handleUpdateLocation);
    this.addRoute('GET', '/delivery/statistics/:delivery_boy_id', this.handleGetStatistics);

    // Assignment Management
    this.addRoute('GET', '/delivery/assignments/:delivery_boy_id', this.handleGetAssignments);
    this.addRoute('PUT', '/delivery/assignments/:assignment_id/accept', this.handleAcceptAssignment);
    this.addRoute('PUT', '/delivery/assignments/:assignment_id/status', this.handleUpdateAssignmentStatus);
    this.addRoute('GET', '/delivery/assignments/:assignment_id/route', this.handleGetRouteOptimization);

    // Order Tracking
    this.addRoute('GET', '/tracking/:order_id', this.handleGetOrderTracking);
    this.addRoute('POST', '/tracking/:order_id/update', this.handleAddTrackingUpdate);
    this.addRoute('POST', '/tracking/multiple', this.handleGetMultipleOrderTracking);

    // Delivery Pricing
    this.addRoute('GET', '/delivery/pricing/:pincode', this.handleCalculateDeliveryFee);
    this.addRoute('GET', '/delivery/availability/:pincode', this.handleCheckDeliveryAvailability);

    // Notifications
    this.addRoute('GET', '/delivery/notifications/:delivery_boy_id', this.handleGetNotifications);
    this.addRoute('POST', '/delivery/notify/:order_id', this.handleNotifyCustomer);

    // Real-time endpoints (for WebSocket simulation)
    this.addRoute('GET', '/delivery/live-tracking/:order_id', this.handleLiveTracking);
    this.addRoute('POST', '/delivery/broadcast-location', this.handleBroadcastLocation);
  }

  private addRoute(method: string, path: string, handler: (req: DeliveryApiRequest) => Promise<any>) {
    this.routes.push({ method, path, handler: handler.bind(this) });
  }

  /**
   * Main routing function
   */
  async handleRequest(req: DeliveryApiRequest): Promise<any> {
    const route = this.matchRoute(req.method, req.path);
    
    if (!route) {
      return {
        success: false,
        error: 'Delivery endpoint not found',
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

  private matchRoute(method: string, path: string): DeliveryApiRoute | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      
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

  private async handleHealthCheck(req: DeliveryApiRequest) {
    return await DeliveryAPI.healthCheck();
  }

  // Delivery Boy Management Handlers
  private async handleGetProfile(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/profile/:delivery_boy_id', req.path);
    const deliveryBoyId = params.delivery_boy_id;

    if (!deliveryBoyId) {
      return {
        success: false,
        error: 'Delivery boy ID is required',
        status: 400
      };
    }

    return await DeliveryAPI.DeliveryBoy.getProfile(deliveryBoyId);
  }

  private async handleUpdateStatus(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/status/:delivery_boy_id', req.path);
    const deliveryBoyId = params.delivery_boy_id;
    const { status } = req.body || {};

    if (!deliveryBoyId || !status) {
      return {
        success: false,
        error: 'Delivery boy ID and status are required',
        status: 400
      };
    }

    return await DeliveryAPI.DeliveryBoy.updateStatus(deliveryBoyId, status);
  }

  private async handleUpdateLocation(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/location/:delivery_boy_id', req.path);
    const deliveryBoyId = params.delivery_boy_id;
    const { lat, lng, address } = req.body || {};

    if (!deliveryBoyId || !lat || !lng) {
      return {
        success: false,
        error: 'Delivery boy ID, latitude, and longitude are required',
        status: 400
      };
    }

    return await DeliveryAPI.DeliveryBoy.updateLocation(deliveryBoyId, { lat, lng, address });
  }

  private async handleGetStatistics(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/statistics/:delivery_boy_id', req.path);
    const deliveryBoyId = params.delivery_boy_id;

    if (!deliveryBoyId) {
      return {
        success: false,
        error: 'Delivery boy ID is required',
        status: 400
      };
    }

    return await DeliveryAPI.DeliveryBoy.getStatistics(deliveryBoyId);
  }

  // Assignment Management Handlers
  private async handleGetAssignments(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/assignments/:delivery_boy_id', req.path);
    const deliveryBoyId = params.delivery_boy_id;
    const status = req.query?.status;

    if (!deliveryBoyId) {
      return {
        success: false,
        error: 'Delivery boy ID is required',
        status: 400
      };
    }

    return await DeliveryAPI.Assignment.getAssignments(deliveryBoyId, status);
  }

  private async handleAcceptAssignment(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/assignments/:assignment_id/accept', req.path);
    const assignmentId = params.assignment_id;

    if (!assignmentId) {
      return {
        success: false,
        error: 'Assignment ID is required',
        status: 400
      };
    }

    return await DeliveryAPI.Assignment.acceptAssignment(assignmentId);
  }

  private async handleUpdateAssignmentStatus(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/assignments/:assignment_id/status', req.path);
    const assignmentId = params.assignment_id;
    const { status, notes } = req.body || {};

    if (!assignmentId || !status) {
      return {
        success: false,
        error: 'Assignment ID and status are required',
        status: 400
      };
    }

    return await DeliveryAPI.Assignment.updateStatus(assignmentId, status, notes);
  }

  private async handleGetRouteOptimization(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/assignments/:assignment_id/route', req.path);
    const assignmentId = params.assignment_id;

    if (!assignmentId) {
      return {
        success: false,
        error: 'Assignment ID is required',
        status: 400
      };
    }

    return await DeliveryAPI.Assignment.getRouteOptimization(assignmentId);
  }

  // Order Tracking Handlers
  private async handleGetOrderTracking(req: DeliveryApiRequest) {
    const params = this.extractParams('/tracking/:order_id', req.path);
    const orderId = params.order_id;

    if (!orderId) {
      return {
        success: false,
        error: 'Order ID is required',
        status: 400
      };
    }

    return await DeliveryAPI.Tracking.getTracking(orderId);
  }

  private async handleAddTrackingUpdate(req: DeliveryApiRequest) {
    const params = this.extractParams('/tracking/:order_id/update', req.path);
    const orderId = params.order_id;
    const { status, location, notes, delivery_boy_id } = req.body || {};

    if (!orderId || !status) {
      return {
        success: false,
        error: 'Order ID and status are required',
        status: 400
      };
    }

    return await DeliveryAPI.Tracking.addTrackingUpdate(orderId, status, location, notes, delivery_boy_id);
  }

  private async handleGetMultipleOrderTracking(req: DeliveryApiRequest) {
    const { order_ids } = req.body || {};

    if (!order_ids || !Array.isArray(order_ids)) {
      return {
        success: false,
        error: 'Order IDs array is required',
        status: 400
      };
    }

    return await DeliveryAPI.Tracking.getMultipleOrderTracking(order_ids);
  }

  // Delivery Pricing Handlers
  private async handleCalculateDeliveryFee(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/pricing/:pincode', req.path);
    const pincode = params.pincode;
    const orderValue = parseFloat(req.query?.order_value || '0');
    const distance = req.query?.distance ? parseFloat(req.query.distance) : undefined;

    if (!pincode || !orderValue) {
      return {
        success: false,
        error: 'Pincode and order value are required',
        status: 400
      };
    }

    return await DeliveryAPI.Pricing.calculateDeliveryFee(pincode, orderValue, distance);
  }

  private async handleCheckDeliveryAvailability(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/availability/:pincode', req.path);
    const pincode = params.pincode;

    if (!pincode) {
      return {
        success: false,
        error: 'Pincode is required',
        status: 400
      };
    }

    return await DeliveryAPI.Pricing.checkDeliveryAvailability(pincode);
  }

  // Notification Handlers
  private async handleGetNotifications(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/notifications/:delivery_boy_id', req.path);
    const deliveryBoyId = params.delivery_boy_id;

    if (!deliveryBoyId) {
      return {
        success: false,
        error: 'Delivery boy ID is required',
        status: 400
      };
    }

    return await DeliveryAPI.Notification.getNotifications(deliveryBoyId);
  }

  private async handleNotifyCustomer(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/notify/:order_id', req.path);
    const orderId = params.order_id;
    const { status, message } = req.body || {};

    if (!orderId || !status || !message) {
      return {
        success: false,
        error: 'Order ID, status, and message are required',
        status: 400
      };
    }

    return await DeliveryAPI.Notification.notifyCustomer(orderId, status, message);
  }

  // Real-time Tracking Handlers
  private async handleLiveTracking(req: DeliveryApiRequest) {
    const params = this.extractParams('/delivery/live-tracking/:order_id', req.path);
    const orderId = params.order_id;

    if (!orderId) {
      return {
        success: false,
        error: 'Order ID is required',
        status: 400
      };
    }

    // Get latest tracking info with delivery boy location
    const trackingResult = await DeliveryAPI.Tracking.getTracking(orderId);
    
    if (!trackingResult.success) {
      return trackingResult;
    }

    const latestTracking = trackingResult.data?.[trackingResult.data.length - 1];
    
    return {
      success: true,
      data: {
        order_id: orderId,
        current_status: latestTracking?.status || 'unknown',
        last_update: latestTracking?.timestamp || null,
        delivery_boy_location: latestTracking?.location || null,
        estimated_arrival: latestTracking?.estimated_arrival || null,
        live_updates: trackingResult.data
      },
      message: 'Live tracking data retrieved successfully'
    };
  }

  private async handleBroadcastLocation(req: DeliveryApiRequest) {
    const { delivery_boy_id, location, order_ids } = req.body || {};

    if (!delivery_boy_id || !location || !order_ids) {
      return {
        success: false,
        error: 'Delivery boy ID, location, and order IDs are required',
        status: 400
      };
    }

    // Update delivery boy location
    const locationResult = await DeliveryAPI.DeliveryBoy.updateLocation(delivery_boy_id, location);
    
    if (!locationResult.success) {
      return locationResult;
    }

    // Add tracking updates for all active orders
    const trackingPromises = order_ids.map((orderId: string) =>
      DeliveryAPI.Tracking.addTrackingUpdate(
        orderId,
        'in_transit',
        location,
        'Location update from delivery partner',
        delivery_boy_id
      )
    );

    await Promise.all(trackingPromises);

    return {
      success: true,
      data: {
        location_updated: true,
        orders_updated: order_ids.length,
        timestamp: new Date().toISOString()
      },
      message: 'Location broadcast successful'
    };
  }

  /**
   * Get all available delivery routes
   */
  getRoutes(): DeliveryApiRoute[] {
    return this.routes.map(route => ({
      method: route.method,
      path: route.path,
      handler: route.handler
    }));
  }
}

// Integration helpers for different platforms
export const createDeliveryExpressHandler = (router: DeliveryApiRouter) => {
  return async (req: any, res: any) => {
    const apiRequest: DeliveryApiRequest = {
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

export const createDeliveryFetchHandler = (router: DeliveryApiRouter) => {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname.replace('/api', '');
    
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.json();
      } catch {
        // Body might not be JSON
      }
    }

    const query: Record<string, any> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const apiRequest: DeliveryApiRequest = {
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

// Default delivery router instance
export const deliveryApiRouter = new DeliveryApiRouter();

export default DeliveryApiRouter; 