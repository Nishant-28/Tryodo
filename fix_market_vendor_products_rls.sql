-- Fix RLS policies for market_vendor_products table
-- The issue is that policies are checking auth.uid() against profiles.id 
-- instead of checking against profiles.user_id

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all vendor products" ON public.market_vendor_products;
DROP POLICY IF EXISTS "Vendors can manage their own products" ON public.market_vendor_products;

-- Create corrected policies
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

-- Keep the existing SELECT policy as it's correct
-- "Market vendor products are viewable by everyone" FOR SELECT USING (is_active = true); 