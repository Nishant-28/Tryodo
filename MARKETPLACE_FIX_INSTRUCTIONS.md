# 🚨 URGENT: Fix Marketplace "No Products Found" Issue

## The Problem
The `market_vendor_products` table is empty even though vendor requests are approved. This is due to incorrect RLS policies blocking vendor product creation.

## Immediate Fix (Run in Supabase SQL Editor)

### Step 1: Fix RLS Policies (for `market_vendor_products` AND `market_products`)
```sql
-- Fix RLS policies for market_vendor_products table
DROP POLICY IF EXISTS "Admins can manage all vendor products" ON public.market_vendor_products;
DROP POLICY IF EXISTS "Vendors can manage their own products" ON public.market_vendor_products;

-- Create corrected policies for market_vendor_products
CREATE POLICY "Admins can manage all vendor products" ON public.market_vendor_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Vendors can manage their own products" ON public.market_vendor_products
FOR ALL USING (
  vendor_id IN (
    SELECT vendors.id
    FROM vendors
    JOIN profiles ON vendors.profile_id = profiles.id
    WHERE profiles.user_id = auth.uid()
  )
);

-- Fix RLS policies for market_products table (NEW!)
DROP POLICY IF EXISTS "Only admins can manage market products" ON public.market_products;

CREATE POLICY "Only admins can manage market products" ON public.market_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

### Step 2: Create the Missing Vendor Product
```sql
-- Create vendor product for the approved request
INSERT INTO market_vendor_products (
  vendor_id,
  market_product_id,
  price,
  stock_quantity,
  delivery_time_hours,
  is_active,
  is_in_stock,
  last_stock_update,
  low_stock_threshold,
  vendor_notes
) VALUES (
  '2ea3e91e-7c22-4cd0-847d-e3f9fa62f5e1',  -- Test Vendor
  'a7ebb4ac-4a5d-47c5-88c7-9e0706c3ba79',  -- C type cable
  100.00,
  10,
  1,
  true,
  true,
  NOW(),
  5,
  'High quality C type cable'
);
```

### Step 3: Fix the Product Slug (IMPORTANT for Product Detail Page)
```sql
-- Fix the empty product slug to prevent 404 errors
UPDATE market_products 
SET slug = 'c-type-cable'
WHERE id = 'a7ebb4ac-4a5d-47c5-88c7-9e0706c3ba79' AND (slug IS NULL OR slug = '');
```

### Step 4: Update Product Images (NEW!)
```sql
-- Update the images JSONB array for the 'C type cable' product
UPDATE market_products
SET images = '["https://example.com/c-type-cable-image-1.jpg", "https://example.com/c-type-cable-image-2.jpg"]'::jsonb
WHERE id = 'a7ebb4ac-4a5d-47c5-88c7-9e0706c3ba79';
```

### Step 5: Verify the Fix
```sql
-- Check if vendor product was created and product slug/images are updated
SELECT 
  mp.name as product_name,
  mp.slug,
  mp.images,
  mvp.id as vendor_product_id,
  mvp.price,
  mvp.stock_quantity,
  mvp.is_in_stock,
  mvp.is_active,
  v.business_name
FROM market_products mp
LEFT JOIN market_vendor_products mvp ON mp.id = mvp.market_product_id
LEFT JOIN vendors v ON mvp.vendor_id = v.id
WHERE mp.id = 'a7ebb4ac-4a5d-47c5-88c7-9e0706c3ba79';
```

## Expected Result
After running these SQL commands, you should see:
1. ✅ All RLS policies are correctly applied
2. ✅ 1 vendor product in the database
3. ✅ Market product slug updated to 'c-type-cable'
4. ✅ Market product images updated with the provided URLs
5. ✅ Market page showing "C type cable" product
6. ✅ Product showing "Test Vendor" as seller with ₹100.00 price
7. ✅ **Clicking on product will work** (no more 404 error)
8. ✅ Product detail page will display the images correctly.

## Instructions
1. **Go to your Supabase Dashboard**
2. **Navigate to**: SQL Editor
3. **Run Step 1** first (fix RLS policies - crucial!)
4. **Run Step 2** (create vendor product)
5. **Run Step 3** (fix product slug)
6. **Run Step 4** (update product images) ← **NEW!**
7. **Run Step 5** (verify all fixes)
8. **Test**: Go to `/market` page - it should now show the product!
9. **Test**: Click on the product - it should open the product detail page with images!

## Root Cause
Incorrect RLS policies were blocking `INSERT` into `market_vendor_products` and `UPDATE` on `market_products`. Additionally, an empty product slug caused 404 errors, and the images were not correctly set.

## Future Prevention
With the corrected RLS policies, future admin actions and vendor product creations should work correctly. Always ensure data, especially slugs and image arrays, are properly formatted upon insertion/update. 