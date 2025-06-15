# Tryodo Delivery Partner API Documentation

## Overview

The Tryodo Delivery Partner API provides comprehensive endpoints for delivery partner applications, real-time order tracking, and delivery management. This API enables delivery partners to manage assignments, update order status, and provide real-time location tracking.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Delivery partner endpoints require authentication. Include the delivery partner's authentication token in the request headers:

```
Authorization: Bearer <delivery_partner_token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string (only if success is false)
}
```

## Delivery Partner Endpoints

### Health Check

#### GET `/delivery/health`
Check if the delivery API is operational.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "delivery_service": "operational"
  },
  "message": "Delivery API is running smoothly"
}
```

## Delivery Boy Management

### Get Profile

#### GET `/delivery/profile/{delivery_boy_id}`
Get delivery partner profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+91-9876543210",
    "email": "john@example.com",
    "assigned_pincodes": ["110001", "110002"],
    "status": "active",
    "current_location": {
      "lat": 28.6139,
      "lng": 77.2090,
      "address": "Connaught Place, Delhi",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    "vehicle_type": "bike",
    "vehicle_number": "DL01AB1234",
    "rating": 4.8,
    "total_deliveries": 150,
    "successful_deliveries": 145,
    "is_verified": true
  }
}
```

### Update Status

#### PUT `/delivery/status/{delivery_boy_id}`
Update delivery partner status.

**Request Body:**
```json
{
  "status": "active" // active, inactive, busy, offline
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "last_active_at": "2024-01-01T12:00:00.000Z"
  },
  "message": "Status updated to active"
}
```

### Update Location

#### POST `/delivery/location/{delivery_boy_id}`
Update delivery partner's current location.

**Request Body:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090,
  "address": "Connaught Place, Delhi"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "Connaught Place, Delhi",
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "message": "Location updated successfully"
}
```

### Get Statistics

#### GET `/delivery/statistics/{delivery_boy_id}`
Get delivery partner performance statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_deliveries": 150,
    "successful_deliveries": 145,
    "cancelled_deliveries": 5,
    "rating": 4.8,
    "today_deliveries": 8,
    "today_assignments": 10,
    "success_rate": 97
  },
  "message": "Statistics retrieved successfully"
}
```

## Assignment Management

### Get Assignments

#### GET `/delivery/assignments/{delivery_boy_id}`
Get delivery assignments for a delivery partner.

**Query Parameters:**
- `status` (optional): Filter by assignment status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assignment-uuid",
      "delivery_boy_id": "delivery-boy-uuid",
      "order_ids": ["order-uuid-1", "order-uuid-2"],
      "pickup_addresses": [
        {
          "vendor_name": "TechMart",
          "address": "Shop 123, Market Street",
          "phone": "+91-9876543210",
          "lat": 28.6139,
          "lng": 77.2090
        }
      ],
      "delivery_addresses": [
        {
          "customer_name": "Jane Smith",
          "address": "Flat 456, Residential Complex",
          "phone": "+91-9876543211",
          "lat": 28.6200,
          "lng": 77.2100
        }
      ],
      "total_orders": 2,
      "estimated_distance": 5.2,
      "estimated_time": 45,
      "status": "assigned",
      "priority": "normal",
      "assigned_at": "2024-01-01T10:00:00.000Z",
      "delivery_instructions": "Call before delivery"
    }
  ],
  "message": "Assignments retrieved successfully"
}
```

### Accept Assignment

#### PUT `/delivery/assignments/{assignment_id}/accept`
Accept a delivery assignment.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid",
    "status": "accepted",
    "accepted_at": "2024-01-01T10:30:00.000Z"
  },
  "message": "Assignment accepted successfully"
}
```

### Update Assignment Status

#### PUT `/delivery/assignments/{assignment_id}/status`
Update the status of a delivery assignment.

**Request Body:**
```json
{
  "status": "picked_up", // assigned, accepted, picked_up, in_transit, delivered, cancelled, failed
  "notes": "All items picked up from vendor"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid",
    "status": "picked_up",
    "pickup_completed_at": "2024-01-01T11:00:00.000Z"
  },
  "message": "Assignment status updated to picked_up"
}
```

### Get Route Optimization

#### GET `/delivery/assignments/{assignment_id}/route`
Get optimized route for pickup and delivery locations.

**Response:**
```json
{
  "success": true,
  "data": {
    "pickup_sequence": [
      {
        "order": 1,
        "address": {
          "vendor_name": "TechMart",
          "address": "Shop 123, Market Street"
        },
        "estimated_time": 15
      }
    ],
    "delivery_sequence": [
      {
        "order": 1,
        "address": {
          "customer_name": "Jane Smith",
          "address": "Flat 456, Residential Complex"
        },
        "estimated_time": 10
      }
    ],
    "total_estimated_time": 45,
    "total_estimated_distance": 5.2
  },
  "message": "Route optimization calculated successfully"
}
```

## Order Tracking

### Get Order Tracking

#### GET `/tracking/{order_id}`
Get complete tracking history for an order.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tracking-uuid",
      "order_id": "order-uuid",
      "status": "order_placed",
      "location": null,
      "timestamp": "2024-01-01T09:00:00.000Z",
      "notes": "Order placed successfully"
    },
    {
      "id": "tracking-uuid-2",
      "order_id": "order-uuid",
      "status": "assigned_for_pickup",
      "location": {
        "lat": 28.6139,
        "lng": 77.2090,
        "address": "TechMart Store"
      },
      "timestamp": "2024-01-01T10:00:00.000Z",
      "notes": "Assigned to delivery partner",
      "delivery_boy_id": "delivery-boy-uuid"
    }
  ],
  "message": "Order tracking retrieved successfully"
}
```

### Add Tracking Update

#### POST `/tracking/{order_id}/update`
Add a new tracking update for an order.

**Request Body:**
```json
{
  "status": "picked_up",
  "location": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "TechMart Store"
  },
  "notes": "Order picked up from vendor",
  "delivery_boy_id": "delivery-boy-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tracking-uuid",
    "order_id": "order-uuid",
    "status": "picked_up",
    "timestamp": "2024-01-01T11:00:00.000Z"
  },
  "message": "Tracking update added successfully"
}
```

### Get Multiple Order Tracking

#### POST `/tracking/multiple`
Get tracking information for multiple orders.

**Request Body:**
```json
{
  "order_ids": ["order-uuid-1", "order-uuid-2", "order-uuid-3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order-uuid-1": {
      "order_id": "order-uuid-1",
      "status": "in_transit",
      "location": {
        "lat": 28.6200,
        "lng": 77.2100
      },
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    "order-uuid-2": {
      "order_id": "order-uuid-2",
      "status": "delivered",
      "timestamp": "2024-01-01T11:30:00.000Z"
    }
  },
  "message": "Multiple order tracking retrieved successfully"
}
```

## Delivery Pricing

### Calculate Delivery Fee

#### GET `/delivery/pricing/{pincode}?order_value={value}&distance={km}`
Calculate delivery fee for a specific pincode and order value.

**Query Parameters:**
- `order_value` (required): Order value in rupees
- `distance` (optional): Distance in kilometers

**Example:** `/delivery/pricing/110001?order_value=1500&distance=3.5`

**Response:**
```json
{
  "success": true,
  "data": {
    "base_price": 50,
    "calculated_fee": 0,
    "is_free_delivery": true,
    "free_delivery_threshold": 1000,
    "distance_fee": 35
  },
  "message": "Delivery fee calculated successfully"
}
```

### Check Delivery Availability

#### GET `/delivery/availability/{pincode}`
Check if delivery is available for a specific pincode.

**Response:**
```json
{
  "success": true,
  "data": {
    "is_available": true,
    "pricing": {
      "base_price": 50,
      "free_delivery_threshold": 1000
    },
    "message": "Delivery available"
  },
  "message": "Delivery availability checked successfully"
}
```

## Notifications

### Get Notifications

#### GET `/delivery/notifications/{delivery_boy_id}`
Get notifications for a delivery partner.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "assignment-uuid",
      "type": "new_assignment",
      "title": "New Delivery Assignment",
      "message": "You have 2 new order(s) to deliver",
      "timestamp": "2024-01-01T10:00:00.000Z",
      "data": {
        "assignment_id": "assignment-uuid",
        "total_orders": 2
      }
    }
  ],
  "message": "Notifications retrieved successfully"
}
```

### Notify Customer

#### POST `/delivery/notify/{order_id}`
Send notification to customer about delivery status.

**Request Body:**
```json
{
  "status": "out_for_delivery",
  "message": "Your order is out for delivery and will reach you in 30 minutes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notification_sent": true
  },
  "message": "Customer notification sent successfully"
}
```

## Real-time Tracking

### Live Tracking

#### GET `/delivery/live-tracking/{order_id}`
Get real-time tracking information for an order.

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "order-uuid",
    "current_status": "in_transit",
    "last_update": "2024-01-01T12:00:00.000Z",
    "delivery_boy_location": {
      "lat": 28.6200,
      "lng": 77.2100,
      "address": "Near Customer Location"
    },
    "estimated_arrival": "2024-01-01T12:30:00.000Z",
    "live_updates": [...]
  },
  "message": "Live tracking data retrieved successfully"
}
```

### Broadcast Location

#### POST `/delivery/broadcast-location`
Broadcast delivery partner location to multiple orders.

**Request Body:**
```json
{
  "delivery_boy_id": "delivery-boy-uuid",
  "location": {
    "lat": 28.6200,
    "lng": 77.2100,
    "address": "Current Location"
  },
  "order_ids": ["order-uuid-1", "order-uuid-2"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "location_updated": true,
    "orders_updated": 2,
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "message": "Location broadcast successful"
}
```

## Error Handling

### Common Error Codes

- `400` - Bad Request (missing parameters, invalid format)
- `401` - Unauthorized (invalid or missing authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### Error Response Example

```json
{
  "success": false,
  "error": "Delivery boy ID is required",
  "status": 400
}
```

## Usage Examples

### JavaScript/React Native (Delivery Partner App)

```javascript
const DELIVERY_API_BASE = 'https://your-domain.com/api';
const authToken = 'delivery_partner_token';

// Get assignments
const getAssignments = async (deliveryBoyId) => {
  const response = await fetch(`${DELIVERY_API_BASE}/delivery/assignments/${deliveryBoyId}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

// Update location
const updateLocation = async (deliveryBoyId, location) => {
  const response = await fetch(`${DELIVERY_API_BASE}/delivery/location/${deliveryBoyId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(location)
  });
  return await response.json();
};

// Accept assignment
const acceptAssignment = async (assignmentId) => {
  const response = await fetch(`${DELIVERY_API_BASE}/delivery/assignments/${assignmentId}/accept`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

// Update assignment status
const updateAssignmentStatus = async (assignmentId, status, notes) => {
  const response = await fetch(`${DELIVERY_API_BASE}/delivery/assignments/${assignmentId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status, notes })
  });
  return await response.json();
};
```

### Customer Tracking (React/Web)

```javascript
// Track order in real-time
const trackOrder = async (orderId) => {
  const response = await fetch(`${API_BASE}/tracking/${orderId}`);
  return await response.json();
};

// Get live tracking
const getLiveTracking = async (orderId) => {
  const response = await fetch(`${API_BASE}/delivery/live-tracking/${orderId}`);
  return await response.json();
};

// Real-time tracking with polling
const startRealTimeTracking = (orderId, callback) => {
  const interval = setInterval(async () => {
    try {
      const tracking = await getLiveTracking(orderId);
      callback(tracking);
    } catch (error) {
      console.error('Tracking error:', error);
    }
  }, 30000); // Update every 30 seconds

  return () => clearInterval(interval);
};
```

### cURL Examples

```bash
# Get delivery boy profile
curl -X GET "https://your-domain.com/api/delivery/profile/delivery-boy-uuid" \
  -H "Authorization: Bearer delivery_partner_token"

# Update status
curl -X PUT "https://your-domain.com/api/delivery/status/delivery-boy-uuid" \
  -H "Authorization: Bearer delivery_partner_token" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'

# Update location
curl -X POST "https://your-domain.com/api/delivery/location/delivery-boy-uuid" \
  -H "Authorization: Bearer delivery_partner_token" \
  -H "Content-Type: application/json" \
  -d '{"lat": 28.6139, "lng": 77.2090, "address": "Current Location"}'

# Get assignments
curl -X GET "https://your-domain.com/api/delivery/assignments/delivery-boy-uuid?status=assigned" \
  -H "Authorization: Bearer delivery_partner_token"

# Track order
curl -X GET "https://your-domain.com/api/tracking/order-uuid"
```

## WebSocket Integration (Future)

For real-time updates, WebSocket connections can be established:

```javascript
// WebSocket connection for real-time tracking
const ws = new WebSocket('wss://your-domain.com/ws/tracking/order-uuid');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'tracking_update') {
    updateTrackingUI(data.data);
  }
};

// Subscribe to tracking updates
ws.send(JSON.stringify({
  type: 'subscribe_tracking',
  order_id: 'order-uuid'
}));
```

## Database Schema

The delivery API uses these main tables:

- `delivery_boys` - Delivery partner information
- `delivery_assignments` - Order assignments to delivery partners
- `order_tracking` - Tracking history for orders
- `delivery_pricing` - Pricing rules by pincode
- `delivery_reviews` - Customer reviews for delivery partners

## Security Considerations

1. **Authentication**: All delivery partner endpoints require valid authentication tokens
2. **Authorization**: Delivery partners can only access their own data
3. **Location Privacy**: Customer locations are only shared with assigned delivery partners
4. **Data Validation**: All inputs are validated and sanitized
5. **Rate Limiting**: API calls are rate-limited to prevent abuse

## Support

For delivery API support:
- Email: delivery-api@tryodo.com
- Documentation: https://docs.tryodo.com/delivery-api
- Status Page: https://status.tryodo.com

## Changelog

### v1.0.0 (Current)
- Initial delivery API release
- Delivery partner management
- Assignment handling
- Real-time tracking
- Pricing calculations
- Notification system 