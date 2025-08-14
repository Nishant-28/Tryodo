# Order Cancellation API Documentation

## Overview

The Order Cancellation API provides endpoints for managing order cancellations in the delivery system. This API allows delivery partners to cancel orders that cannot be completed, tracks cancellation reasons, and provides analytics for administrators.

## Authentication

All API endpoints require authentication using Bearer tokens:

```
Authorization: Bearer <your-access-token>
```

## Endpoints

### 1. Cancel Order

Cancels an order that is currently out for delivery.

**Endpoint:** `POST /delivery/orders/{orderId}/cancel`

**Parameters:**
- `orderId` (path, required): The unique identifier of the order to cancel

**Request Body:**
```json
{
  "delivery_partner_id": "string",
  "cancellation_reason": "string",
  "additional_details": "string" // optional
}
```

**Request Example:**
```json
{
  "delivery_partner_id": "dp-123e4567-e89b-12d3-a456-426614174000",
  "cancellation_reason": "Customer unavailable",
  "additional_details": "Customer was not available after multiple attempts. Neighbors confirmed no one is home."
}
```

**Response:**
```json
{
  "success": true,
  "cancellation_id": "cancel-123e4567-e89b-12d3-a456-426614174000",
  "message": "Order cancelled successfully and inventory restored",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Order not found or not eligible for cancellation",
  "error_code": "ORDER_NOT_CANCELLABLE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200 OK`: Order cancelled successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Delivery partner not authorized for this order
- `404 Not Found`: Order not found
- `409 Conflict`: Order not in cancellable state

**Cancellation Reasons:**
- `Customer unavailable`
- `Incorrect address`
- `Damaged product`
- `Customer refused delivery`
- `Delivery issues`
- `Other`

---

### 2. Check Cancellation Eligibility

Checks if an order can be cancelled by a specific delivery partner.

**Endpoint:** `GET /delivery/orders/{orderId}/can-cancel`

**Parameters:**
- `orderId` (path, required): The unique identifier of the order
- `delivery_partner_id` (query, required): The delivery partner ID

**Request Example:**
```
GET /delivery/orders/order-123/can-cancel?delivery_partner_id=dp-456
```

**Response:**
```json
{
  "success": true,
  "can_cancel": true,
  "reason": "Order is eligible for cancellation",
  "order_status": "out_for_delivery",
  "assigned_partner": "dp-456"
}
```

**Response (Not Eligible):**
```json
{
  "success": true,
  "can_cancel": false,
  "reason": "Order has already been delivered",
  "order_status": "delivered",
  "assigned_partner": "dp-456"
}
```

---

### 3. Get Vendor Cancelled Orders

Retrieves cancelled orders for a specific vendor.

**Endpoint:** `GET /vendors/{vendorId}/cancelled-orders`

**Parameters:**
- `vendorId` (path, required): The unique identifier of the vendor
- `page` (query, optional): Page number (default: 1)
- `limit` (query, optional): Number of results per page (default: 20, max: 100)
- `start_date` (query, optional): Filter orders from this date (ISO 8601 format)
- `end_date` (query, optional): Filter orders until this date (ISO 8601 format)

**Request Example:**
```
GET /vendors/vendor-123/cancelled-orders?page=1&limit=10&start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "order_id": "order-123",
      "order_number": "ORD-2024-001",
      "total_amount": 2500.00,
      "cancellation_reason": "Customer unavailable",
      "additional_details": "Customer was not available after multiple attempts",
      "cancelled_at": "2024-01-15T10:30:00Z",
      "delivery_partner": {
        "id": "dp-456",
        "name": "John Doe",
        "phone": "+91-9876543210"
      },
      "customer": {
        "name": "Jane Smith",
        "phone": "+91-9876543211"
      },
      "items": [
        {
          "product_name": "iPhone 14 Pro",
          "quantity": 1,
          "unit_price": 2500.00,
          "line_total": 2500.00
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 47,
    "per_page": 10
  }
}
```

---

### 4. Get Cancellation Analytics

Retrieves cancellation analytics and statistics.

**Endpoint:** `GET /admin/cancellation-analytics`

**Parameters:**
- `vendor_id` (query, optional): Filter by specific vendor
- `delivery_partner_id` (query, optional): Filter by specific delivery partner
- `start_date` (query, optional): Start date for analytics period
- `end_date` (query, optional): End date for analytics period

**Request Example:**
```
GET /admin/cancellation-analytics?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_cancellations": 125,
    "cancellation_rate": 5.2,
    "cancellation_trend": -2.5,
    "average_cancelled_order_value": 1750.00,
    "total_value_lost": 218750.00,
    "peak_cancellation_hour": 14,
    "top_reasons": [
      {
        "reason": "Customer unavailable",
        "count": 45,
        "percentage": 36.0
      },
      {
        "reason": "Incorrect address",
        "count": 32,
        "percentage": 25.6
      },
      {
        "reason": "Customer refused delivery",
        "count": 28,
        "percentage": 22.4
      }
    ],
    "delivery_partner_stats": [
      {
        "delivery_partner_id": "dp-123",
        "delivery_partner_name": "John Doe",
        "total_orders": 150,
        "cancellations": 8,
        "cancellation_rate": 5.3
      }
    ],
    "daily_trends": [
      {
        "date": "2024-01-15",
        "cancellations": 5,
        "total_orders": 95,
        "rate": 5.26
      }
    ],
    "hourly_distribution": [
      {
        "hour": 10,
        "cancellations": 12
      },
      {
        "hour": 14,
        "cancellations": 18
      }
    ]
  }
}
```

---

### 5. Get Order Cancellation Details

Retrieves detailed information about a specific order cancellation.

**Endpoint:** `GET /orders/{orderId}/cancellation`

**Parameters:**
- `orderId` (path, required): The unique identifier of the order

**Response:**
```json
{
  "success": true,
  "data": {
    "cancellation_id": "cancel-123",
    "order_id": "order-456",
    "order_number": "ORD-2024-001",
    "delivery_partner": {
      "id": "dp-789",
      "name": "John Doe",
      "phone": "+91-9876543210"
    },
    "cancellation_reason": "Customer unavailable",
    "additional_details": "Customer was not available after multiple attempts",
    "cancelled_at": "2024-01-15T10:30:00Z",
    "inventory_restored": true,
    "refund_status": "pending",
    "notifications_sent": {
      "vendor": true,
      "customer": true,
      "admin": true
    }
  }
}
```

---

## Database Functions

### cancel_order Function

The API uses a PostgreSQL function for atomic order cancellation:

```sql
SELECT cancel_order(
  p_order_id := 'order-123',
  p_delivery_partner_id := 'dp-456',
  p_cancellation_reason := 'Customer unavailable',
  p_additional_details := 'Customer not home'
);
```

**Function Response:**
```json
{
  "success": true,
  "cancellation_id": "cancel-789",
  "message": "Order cancelled successfully and inventory restored"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `ORDER_NOT_FOUND` | The specified order does not exist |
| `ORDER_NOT_CANCELLABLE` | Order is not in a cancellable state |
| `UNAUTHORIZED_PARTNER` | Delivery partner not authorized for this order |
| `INVALID_REASON` | Cancellation reason is not valid |
| `INVENTORY_UPDATE_FAILED` | Failed to restore inventory |
| `NOTIFICATION_FAILED` | Failed to send notifications (non-blocking) |

---

## Rate Limits

- **General API calls**: 100 requests per minute per user
- **Cancellation requests**: 10 requests per minute per delivery partner
- **Analytics requests**: 20 requests per minute per admin user

---

## Webhooks

### Order Cancelled Webhook

Triggered when an order is successfully cancelled.

**Endpoint:** Your configured webhook URL
**Method:** POST
**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: <signature>
X-Event-Type: order.cancelled
```

**Payload:**
```json
{
  "event": "order.cancelled",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "order_id": "order-123",
    "order_number": "ORD-2024-001",
    "cancellation_id": "cancel-456",
    "cancellation_reason": "Customer unavailable",
    "delivery_partner_id": "dp-789",
    "vendor_id": "vendor-123",
    "customer_id": "customer-456",
    "total_amount": 2500.00,
    "inventory_restored": true
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { DeliveryAPI } from '@tryodo/sdk';

// Cancel an order
const result = await DeliveryAPI.cancelOrder(
  'order-123',
  'dp-456',
  'Customer unavailable',
  'Customer was not home after multiple attempts'
);

if (result.success) {
  console.log('Order cancelled:', result.cancellation_id);
} else {
  console.error('Cancellation failed:', result.error);
}

// Get vendor cancelled orders
const cancelledOrders = await DeliveryAPI.getVendorCancelledOrders(
  'vendor-123',
  {
    page: 1,
    limit: 10,
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
);

// Get cancellation analytics
const analytics = await DeliveryAPI.getCancellationAnalytics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### cURL Examples

```bash
# Cancel an order
curl -X POST "https://api.tryodo.com/v1/delivery/orders/order-123/cancel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_partner_id": "dp-456",
    "cancellation_reason": "Customer unavailable",
    "additional_details": "Customer was not home"
  }'

# Get vendor cancelled orders
curl -X GET "https://api.tryodo.com/v1/vendors/vendor-123/cancelled-orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get cancellation analytics
curl -X GET "https://api.tryodo.com/v1/admin/cancellation-analytics?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Testing

### Test Environment

Base URL: `https://api-staging.tryodo.com/v1`

### Test Data

Use the following test data for API testing:

```json
{
  "test_order_id": "test-order-123",
  "test_delivery_partner_id": "test-dp-456",
  "test_vendor_id": "test-vendor-789"
}
```

### Postman Collection

Import our Postman collection for easy API testing:
[Download Postman Collection](./postman/order-cancellation-api.json)

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release of Order Cancellation API
- Added order cancellation endpoint
- Added cancellation eligibility check
- Added vendor cancelled orders endpoint
- Added cancellation analytics endpoint
- Added inventory restoration functionality
- Added webhook support

---

## Support

For API support, please contact:
- **Email**: api-support@tryodo.com
- **Documentation**: https://docs.tryodo.com/api
- **Status Page**: https://status.tryodo.com