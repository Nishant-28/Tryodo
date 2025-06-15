# Tryodo Delivery Partner API Implementation Guide

## Overview

This guide will help you implement the complete delivery partner system for your Tryodo marketplace, including database setup, API integration, and deployment options.

## Prerequisites

- Node.js 18+ and npm/yarn
- Supabase project with admin access
- Basic knowledge of React/TypeScript
- Understanding of REST APIs

## Step 1: Database Setup

### 1.1 Execute Database Schema

First, run the delivery schema SQL in your Supabase SQL editor:

```sql
-- Copy and paste the contents of delivery-schema.sql
-- This will create all necessary tables, indexes, and policies
```

### 1.2 Verify Tables Created

Check that these tables were created successfully:
- `delivery_boys`
- `delivery_assignments` 
- `order_tracking`
- `delivery_pricing`
- `delivery_reviews`

### 1.3 Set Up Row Level Security (RLS)

The schema includes RLS policies, but verify they're enabled:

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('delivery_boys', 'delivery_assignments', 'order_tracking');
```

## Step 2: API Integration

### 2.1 Install Dependencies

Add the delivery API files to your project:

```bash
# Copy these files to your src/lib/ directory:
# - deliveryApi.ts
# - deliveryApiRouter.ts
```

### 2.2 Configure Supabase Client

Update your Supabase configuration to include delivery tables:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for delivery tables
export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  email: string;
  assigned_pincodes: string[];
  status: 'active' | 'inactive' | 'busy' | 'offline';
  current_location: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  vehicle_type: string;
  vehicle_number: string;
  // ... other fields
}

export interface DeliveryAssignment {
  id: string;
  delivery_boy_id: string;
  order_ids: string[];
  status: string;
  // ... other fields
}
```

### 2.3 Initialize Delivery API

```typescript
// src/lib/deliveryService.ts
import DeliveryAPI from './deliveryApi';

// Initialize the delivery API
export const deliveryService = DeliveryAPI;

// Example usage functions
export async function getDeliveryBoyProfile(deliveryBoyId: string) {
  return await deliveryService.DeliveryBoy.getProfile(deliveryBoyId);
}

export async function updateDeliveryBoyStatus(deliveryBoyId: string, status: string) {
  return await deliveryService.DeliveryBoy.updateStatus(deliveryBoyId, status);
}

export async function getAssignments(deliveryBoyId: string, status?: string) {
  return await deliveryService.Assignment.getAssignments(deliveryBoyId, status);
}
```

## Step 3: Deployment Options

### Option A: Vercel Deployment

#### 3.1 Create API Routes

Create API routes in your Next.js app:

```typescript
// pages/api/delivery/[...slug].ts (Pages Router)
// or app/api/delivery/[...slug]/route.ts (App Router)

import { deliveryApiRouter, createDeliveryFetchHandler } from '@/lib/deliveryApiRouter';

const handler = createDeliveryFetchHandler(deliveryApiRouter);

// For App Router
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };

// For Pages Router
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const request = new Request(`${req.url}`, {
    method: req.method,
    headers: req.headers as any,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
  });

  const response = await handler(request);
  const data = await response.json();
  
  res.status(response.status).json(data);
}
```

#### 3.2 Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### 3.3 Deploy to Vercel

```bash
npm run build
vercel --prod
```

### Option B: Express.js Server

#### 3.1 Create Express Server

```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { deliveryApiRouter, createDeliveryExpressHandler } from './src/lib/deliveryApiRouter';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Delivery API routes
const deliveryHandler = createDeliveryExpressHandler(deliveryApiRouter);
app.use('/api/delivery', deliveryHandler);
app.use('/api/tracking', deliveryHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Delivery API server running on port ${port}`);
});
```

#### 3.2 Package.json Scripts

```json
{
  "scripts": {
    "dev": "ts-node server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.38.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "ts-node": "^10.9.1",
    "typescript": "^5.0.0"
  }
}
```

### Option C: Serverless Functions

#### 3.1 Netlify Functions

```typescript
// netlify/functions/delivery.ts
import { deliveryApiRouter, createDeliveryFetchHandler } from '../../src/lib/deliveryApiRouter';

const handler = createDeliveryFetchHandler(deliveryApiRouter);

export { handler };
```

#### 3.2 AWS Lambda

```typescript
// lambda/delivery.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { deliveryApiRouter } from '../src/lib/deliveryApiRouter';

export const handler: APIGatewayProxyHandler = async (event) => {
  const request = {
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters || {},
    body: event.body ? JSON.parse(event.body) : null
  };

  const result = await deliveryApiRouter.handleRequest(request);
  
  return {
    statusCode: result.status || (result.success ? 200 : 400),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(result)
  };
};
```

## Step 4: Frontend Integration

### 4.1 Delivery Partner Dashboard

Create a delivery partner dashboard component:

```typescript
// components/DeliveryDashboard.tsx
import React, { useState, useEffect } from 'react';
import { deliveryService } from '@/lib/deliveryService';

interface DeliveryDashboardProps {
  deliveryBoyId: string;
}

export function DeliveryDashboard({ deliveryBoyId }: DeliveryDashboardProps) {
  const [assignments, setAssignments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [deliveryBoyId]);

  const loadData = async () => {
    try {
      const [assignmentsResult, profileResult] = await Promise.all([
        deliveryService.Assignment.getAssignments(deliveryBoyId),
        deliveryService.DeliveryBoy.getProfile(deliveryBoyId)
      ]);

      if (assignmentsResult.success) setAssignments(assignmentsResult.data);
      if (profileResult.success) setProfile(profileResult.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const result = await deliveryService.DeliveryBoy.updateStatus(deliveryBoyId, status);
      if (result.success) {
        setProfile(prev => ({ ...prev, status }));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="delivery-dashboard">
      <div className="profile-section">
        <h2>Welcome, {profile?.name}</h2>
        <p>Status: {profile?.status}</p>
        <div className="status-controls">
          <button onClick={() => updateStatus('active')}>Go Active</button>
          <button onClick={() => updateStatus('busy')}>Mark Busy</button>
          <button onClick={() => updateStatus('offline')}>Go Offline</button>
        </div>
      </div>

      <div className="assignments-section">
        <h3>Current Assignments</h3>
        {assignments.map(assignment => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </div>
  );
}
```

### 4.2 Customer Tracking Component

```typescript
// components/OrderTracking.tsx
import React, { useState, useEffect } from 'react';

interface OrderTrackingProps {
  orderId: string;
}

export function OrderTracking({ orderId }: OrderTrackingProps) {
  const [tracking, setTracking] = useState([]);
  const [liveTracking, setLiveTracking] = useState(null);

  useEffect(() => {
    loadTracking();
    const interval = setInterval(loadLiveTracking, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const loadTracking = async () => {
    try {
      const response = await fetch(`/api/tracking/${orderId}`);
      const result = await response.json();
      if (result.success) setTracking(result.data);
    } catch (error) {
      console.error('Failed to load tracking:', error);
    }
  };

  const loadLiveTracking = async () => {
    try {
      const response = await fetch(`/api/delivery/live-tracking/${orderId}`);
      const result = await response.json();
      if (result.success) setLiveTracking(result.data);
    } catch (error) {
      console.error('Failed to load live tracking:', error);
    }
  };

  return (
    <div className="order-tracking">
      <h3>Order Tracking</h3>
      
      {liveTracking && (
        <div className="live-status">
          <h4>Current Status: {liveTracking.current_status}</h4>
          {liveTracking.delivery_boy_location && (
            <p>Delivery partner location: {liveTracking.delivery_boy_location.address}</p>
          )}
          {liveTracking.estimated_arrival && (
            <p>Estimated arrival: {new Date(liveTracking.estimated_arrival).toLocaleString()}</p>
          )}
        </div>
      )}

      <div className="tracking-history">
        <h4>Tracking History</h4>
        {tracking.map(update => (
          <div key={update.id} className="tracking-update">
            <div className="status">{update.status}</div>
            <div className="timestamp">{new Date(update.timestamp).toLocaleString()}</div>
            {update.notes && <div className="notes">{update.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Step 5: Testing

### 5.1 API Testing

Create test scripts to verify your API endpoints:

```typescript
// tests/deliveryApi.test.ts
import { deliveryService } from '../src/lib/deliveryService';

describe('Delivery API Tests', () => {
  const testDeliveryBoyId = 'test-delivery-boy-id';

  test('should get delivery boy profile', async () => {
    const result = await deliveryService.DeliveryBoy.getProfile(testDeliveryBoyId);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });

  test('should update delivery boy status', async () => {
    const result = await deliveryService.DeliveryBoy.updateStatus(testDeliveryBoyId, 'active');
    expect(result.success).toBe(true);
  });

  test('should get assignments', async () => {
    const result = await deliveryService.Assignment.getAssignments(testDeliveryBoyId);
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
```

### 5.2 Manual Testing

Use the provided HTML example or create test requests:

```bash
# Test health check
curl -X GET "http://localhost:3000/api/delivery/health"

# Test get profile
curl -X GET "http://localhost:3000/api/delivery/profile/test-id" \
  -H "Authorization: Bearer test-token"

# Test update status
curl -X PUT "http://localhost:3000/api/delivery/status/test-id" \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

## Step 6: Production Considerations

### 6.1 Security

1. **Authentication**: Implement proper JWT authentication
2. **Authorization**: Ensure delivery partners can only access their own data
3. **Rate Limiting**: Add rate limiting to prevent API abuse
4. **Input Validation**: Validate all inputs on the server side

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';

export function authenticateDeliveryPartner(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.deliveryBoyId = decoded.sub;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
```

### 6.2 Performance Optimization

1. **Database Indexing**: Ensure proper indexes are created
2. **Caching**: Implement Redis caching for frequently accessed data
3. **Connection Pooling**: Use connection pooling for database connections

```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedData(key: string) {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedData(key: string, data: any, ttl = 300) {
  await redis.setex(key, ttl, JSON.stringify(data));
}
```

### 6.3 Monitoring and Logging

1. **Error Tracking**: Use Sentry or similar for error tracking
2. **Performance Monitoring**: Monitor API response times
3. **Logging**: Implement structured logging

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 6.4 Real-time Features

For real-time tracking, consider implementing WebSocket connections:

```typescript
// lib/websocket.ts
import { Server } from 'socket.io';

export function setupWebSocket(server: any) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe_tracking', (orderId) => {
      socket.join(`order_${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

// Broadcast tracking updates
export function broadcastTrackingUpdate(io: any, orderId: string, trackingData: any) {
  io.to(`order_${orderId}`).emit('tracking_update', trackingData);
}
```

## Step 7: Mobile App Integration

### 7.1 React Native Integration

```typescript
// services/DeliveryApiService.ts
class DeliveryApiService {
  private baseUrl = 'https://your-api-domain.com/api';
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        ...options.headers,
      },
    });

    return response.json();
  }

  async getProfile(deliveryBoyId: string) {
    return this.request(`/delivery/profile/${deliveryBoyId}`);
  }

  async updateLocation(deliveryBoyId: string, location: any) {
    return this.request(`/delivery/location/${deliveryBoyId}`, {
      method: 'POST',
      body: JSON.stringify(location),
    });
  }

  async getAssignments(deliveryBoyId: string) {
    return this.request(`/delivery/assignments/${deliveryBoyId}`);
  }
}

export const deliveryApiService = new DeliveryApiService();
```

### 7.2 Location Tracking

```typescript
// hooks/useLocationTracking.ts
import { useState, useEffect } from 'react';
import Geolocation from '@react-native-community/geolocation';

export function useLocationTracking(deliveryBoyId: string) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      position => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setLocation(newLocation);
        
        // Update server with new location
        deliveryApiService.updateLocation(deliveryBoyId, newLocation);
      },
      error => console.error('Location error:', error),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    return () => Geolocation.clearWatch(watchId);
  }, [deliveryBoyId]);

  return location;
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS is properly configured
2. **Authentication Failures**: Check JWT token format and expiration
3. **Database Connection Issues**: Verify Supabase credentials
4. **Location Permissions**: Ensure location permissions are granted

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
DEBUG=delivery-api:*

// Or in code
process.env.DEBUG = 'delivery-api:*';
```

## Support and Resources

- **Documentation**: Refer to `DELIVERY_API_DOCUMENTATION.md`
- **Example Implementation**: See `delivery-partner-pwa-example.html`
- **Database Schema**: Check `delivery-schema.sql`

## Next Steps

1. Set up the database schema
2. Deploy the API endpoints
3. Create the delivery partner mobile app
4. Implement customer tracking features
5. Add real-time WebSocket connections
6. Set up monitoring and analytics

Your delivery partner system is now ready for production! 🚚📱 