# Tryodo Marketplace API Documentation

## Overview

The Tryodo Marketplace API provides RESTful endpoints for external applications to integrate with our smartphone marketplace. This API allows third-party developers to access product information, vendor details, pricing data, and market analytics.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Currently, the API endpoints are read-only and don't require authentication. Future versions may include API keys for rate limiting and additional features.

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

## Rate Limiting

- **Current**: No rate limiting implemented
- **Planned**: 1000 requests per hour per IP address

## Endpoints

### Health Check

#### GET `/health`
Check if the API is running.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "database": "connected"
  },
  "message": "Tryodo API is running smoothly"
}
```

### API Information

#### GET `/info`
Get API version and available endpoints.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Tryodo Marketplace API",
    "version": "1.0.0",
    "description": "RESTful API for the Tryodo smartphone marketplace",
    "endpoints": {
      "brands": [...],
      "smartphones": [...],
      "vendors": [...],
      "categories": [...],
      "comparison": [...],
      "analytics": [...]
    }
  }
}
```

### Brands

#### GET `/brands`
Get all active smartphone brands.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Apple",
      "logo_url": "https://...",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Brands retrieved successfully"
}
```

#### GET `/brands/:id`
Get brand details by ID.

**Parameters:**
- `id` (string, required): Brand UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Apple",
    "logo_url": "https://...",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Brand retrieved successfully"
}
```

### Smartphones

#### GET `/smartphones`
Get smartphone models with optional filters and pagination.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20, max: 100)
- `brand_id` (string, optional): Filter by brand UUID
- `search` (string, optional): Search in model name and description
- `min_price` (number, optional): Minimum price filter
- `max_price` (number, optional): Maximum price filter

**Example:** `/smartphones?brand_id=apple-uuid&page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "model_name": "iPhone 15 Pro Max",
      "model_number": "A3999",
      "release_year": 2024,
      "base_price": 1299.00,
      "description": "...",
      "specifications": {...},
      "official_images": ["https://..."],
      "brands": {
        "id": "uuid",
        "name": "Apple",
        "logo_url": "https://..."
      }
    }
  ],
  "message": "Retrieved 10 smartphones"
}
```

#### GET `/smartphones/:id`
Get detailed smartphone information including all vendor listings.

**Parameters:**
- `id` (string, required): Smartphone model UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "model_name": "iPhone 15 Pro Max",
    "specifications": {...},
    "brands": {...},
    "vendor_products": [
      {
        "id": "uuid",
        "price": 1249.00,
        "original_price": 1299.00,
        "warranty_months": 12,
        "stock_quantity": 10,
        "is_in_stock": true,
        "delivery_time_days": 2,
        "vendors": {
          "business_name": "TechMart",
          "rating": 4.8,
          "is_verified": true
        },
        "quality_categories": {
          "name": "Brand New",
          "description": "Factory sealed, brand new condition"
        }
      }
    ]
  },
  "message": "Smartphone details retrieved successfully"
}
```

#### GET `/smartphones/search`
Search smartphones by keyword.

**Query Parameters:**
- `q` (string, required): Search keyword
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page

**Example:** `/smartphones/search?q=iPhone&page=1&limit=10`

### Vendors

#### GET `/vendors`
Get all verified vendors with pagination.

**Query Parameters:**
- `page` (integer, optional): Page number
- `limit` (integer, optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "business_name": "TechMart",
      "rating": 4.8,
      "total_reviews": 1250,
      "total_sales": 5000,
      "response_time_hours": 2,
      "is_verified": true,
      "joined_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Verified vendors retrieved successfully"
}
```

#### GET `/vendors/:id`
Get vendor details with their products.

**Parameters:**
- `id` (string, required): Vendor UUID

#### GET `/vendors/:id/products`
Get all products from a specific vendor.

**Parameters:**
- `id` (string, required): Vendor UUID

**Query Parameters:**
- `page`, `limit`: Pagination
- `category_id`: Filter by category
- `min_price`, `max_price`: Price range filters

### Categories

#### GET `/categories`
Get all product categories.

#### GET `/quality-categories`
Get all quality categories (Brand New, Refurbished, Used, etc.).

### Comparison

#### POST `/compare`
Compare multiple smartphones.

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid1",
      "model_name": "iPhone 15 Pro Max",
      "specifications": {...},
      "vendor_products": [...]
    },
    {
      "id": "uuid2",
      "model_name": "Galaxy S24 Ultra",
      "specifications": {...},
      "vendor_products": [...]
    }
  ],
  "message": "Smartphone comparison data retrieved successfully"
}
```

### Analytics

#### GET `/analytics/popular`
Get most popular smartphones (by views).

**Query Parameters:**
- `limit` (integer, optional): Number of results (default: 10, max: 50)

#### GET `/analytics/stats`
Get marketplace statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_brands": 25,
    "total_smartphones": 150,
    "total_verified_vendors": 45,
    "price_range": {
      "min": 199.00,
      "max": 1899.00,
      "average": 599.50
    },
    "total_products": 1250
  },
  "message": "Market statistics retrieved successfully"
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing parameters, invalid format)
- `404` - Not Found (endpoint or resource doesn't exist)
- `500` - Internal Server Error

Error response example:
```json
{
  "success": false,
  "error": "Smartphone ID is required",
  "status": 400
}
```

## Usage Examples

### JavaScript/Node.js

```javascript
// Get all brands
const response = await fetch('https://your-domain.com/api/brands');
const result = await response.json();

if (result.success) {
  console.log('Brands:', result.data);
} else {
  console.error('Error:', result.error);
}

// Search smartphones
const searchResponse = await fetch('https://your-domain.com/api/smartphones/search?q=iPhone&limit=5');
const searchResult = await searchResponse.json();

// Compare smartphones
const compareResponse = await fetch('https://your-domain.com/api/compare', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ids: ['iphone-15-pro-max-id', 'galaxy-s24-ultra-id']
  })
});
```

### Python

```python
import requests

# Get market statistics
response = requests.get('https://your-domain.com/api/analytics/stats')
data = response.json()

if data['success']:
    stats = data['data']
    print(f"Total smartphones: {stats['total_smartphones']}")
    print(f"Average price: ${stats['price_range']['average']}")
else:
    print(f"Error: {data['error']}")

# Get vendor products
vendor_id = "vendor-uuid-here"
response = requests.get(f'https://your-domain.com/api/vendors/{vendor_id}/products?limit=20')
```

### cURL

```bash
# Health check
curl -X GET https://your-domain.com/api/health

# Get smartphones with filters
curl -X GET "https://your-domain.com/api/smartphones?brand_id=apple-uuid&min_price=500&max_price=1500&page=1&limit=10"

# Compare smartphones
curl -X POST https://your-domain.com/api/compare \
  -H "Content-Type: application/json" \
  -d '{"ids": ["uuid1", "uuid2"]}'
```

## SDKs and Libraries

### Official JavaScript SDK (Coming Soon)

```javascript
import { TryodoAPI } from 'tryodo-api-sdk';

const api = new TryodoAPI('https://your-domain.com/api');

// Get smartphones
const smartphones = await api.smartphones.getAll({ brandId: 'apple-uuid' });

// Search
const searchResults = await api.smartphones.search('iPhone 15');

// Get vendor details
const vendor = await api.vendors.getById('vendor-uuid');
```

## Webhooks (Planned)

Future versions will support webhooks for:
- New product listings
- Price changes
- Stock updates
- New vendor registrations

## Support

For API support and questions:
- Email: api-support@tryodo.com
- Documentation: https://docs.tryodo.com/api
- GitHub Issues: https://github.com/tryodo/api-issues

## Changelog

### v1.0.0 (Current)
- Initial API release
- Read-only endpoints for public data
- Basic filtering and pagination
- Smartphone comparison functionality
- Market analytics endpoints

### Planned Features
- API authentication with keys
- Rate limiting
- Webhooks
- Write operations (for partners)
- Advanced search with filters
- Price history endpoints
- Vendor performance metrics 