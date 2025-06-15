# Tryodo API Implementation Guide

## Overview

This guide shows you how to implement and expose the Tryodo Marketplace API endpoints for external consumption.

## Quick Start

### Import and Test API

```javascript
import TryodoAPI from './src/lib/api';

// Test the API
const result = await TryodoAPI.Brand.getAllBrands();
console.log('Brands:', result);
```

## Implementation Options

### Option 1: Vercel Edge Functions

```javascript
// api/[...route].js
import { ApiRouter, createFetchHandler } from '../src/lib/apiRouter';

const router = new ApiRouter();
export default createFetchHandler(router);
```

### Option 2: Express.js Server

```javascript
// server.js  
const express = require('express');
const { ApiRouter, createExpressHandler } = require('./src/lib/apiRouter');

const app = express();
const router = new ApiRouter();

app.use('/api', createExpressHandler(router));
app.listen(3001);
```

## Testing

```bash
# Test endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/brands
curl "https://your-domain.com/api/smartphones?limit=5"
```

## Environment Setup

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Your Tryodo API is ready for external consumption! 🚀 