-- Delivery Partner Quick Setup SQL
-- This creates the minimum required tables and views for the delivery partner dashboard

-- Update profiles table to include delivery_boy role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['customer'::text, 'vendor'::text, 'admin'::text, 'delivery_boy'::text]));

-- Create delivery_partners table
CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  license_number character varying,
  vehicle_type character varying CHECK (vehicle_type = ANY (ARRAY['bike', 'scooter', 'bicycle', 'car', 'auto'])),
  vehicle_number character varying,
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  total_deliveries integer DEFAULT 0,
  rating numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partners_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partners_profile_id_fkey FOREIGN KEY (profile_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create delivery_partner_orders table
CREATE TABLE IF NOT EXISTS public.delivery_partner_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  delivery_partner_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'accepted' CHECK (status = ANY (ARRAY['accepted', 'picked_up', 'delivered', 'cancelled'])),
  accepted_at timestamp with time zone DEFAULT now(),
  picked_up_at timestamp with time zone,
  delivered_at timestamp with time zone,
  pickup_otp character varying(6) NOT NULL DEFAULT LEFT(md5(random()::text), 6),
  delivery_otp character varying(6) NOT NULL DEFAULT LEFT(md5(random()::text), 6),
  pickup_otp_verified boolean DEFAULT false,
  delivery_otp_verified boolean DEFAULT false,
  delivery_fee numeric DEFAULT 50,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partner_orders_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_orders_order_id_fkey FOREIGN KEY (order_id) 
    REFERENCES public.orders(id) ON DELETE CASCADE,
  CONSTRAINT delivery_partner_orders_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) 
    REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  CONSTRAINT unique_order_assignment UNIQUE (order_id)
);

-- Create delivery_partner_stats table
CREATE TABLE IF NOT EXISTS public.delivery_partner_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_partner_id uuid NOT NULL UNIQUE,
  today_deliveries integer DEFAULT 0,
  week_deliveries integer DEFAULT 0,
  month_deliveries integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  today_earnings numeric DEFAULT 0,
  week_earnings numeric DEFAULT 0,
  month_earnings numeric DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  average_rating numeric DEFAULT 0.00,
  active_orders integer DEFAULT 0,
  stats_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partner_stats_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_stats_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) 
    REFERENCES public.delivery_partners(id) ON DELETE CASCADE
);

-- Create view for available orders (what the dashboard expects)
CREATE OR REPLACE VIEW public.delivery_available_orders_view AS
SELECT DISTINCT
  o.id as order_id,
  o.order_number,
  o.customer_id,
  c_prof.full_name as customer_name,
  c_prof.phone as customer_phone,
  o.delivery_address,
  o.total_amount,
  COUNT(oi.id) as item_count,
  o.created_at,
  v.id as vendor_id,
  v.business_name as vendor_name,
  v_prof.phone as vendor_phone,
  CONCAT(v.business_address, ', ', v.business_city, ', ', v.business_state, ' - ', v.business_pincode) as vendor_address,
  'available_for_pickup' as status,
  CASE 
    WHEN dpo.pickup_otp IS NOT NULL THEN dpo.pickup_otp
    ELSE LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
  END as pickup_otp,
  CASE 
    WHEN dpo.delivery_otp IS NOT NULL THEN dpo.delivery_otp
    ELSE LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
  END as delivery_otp,
  null as distance_km,
  null as estimated_time_mins
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.profiles v_prof ON v.profile_id = v_prof.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles c_prof ON c.profile_id = c_prof.id
LEFT JOIN public.delivery_partner_orders dpo ON o.id = dpo.order_id
WHERE o.order_status = 'confirmed'
  AND oi.item_status = 'confirmed'
  AND (dpo.id IS NULL OR dpo.status = 'accepted')
GROUP BY o.id, o.order_number, o.customer_id, c_prof.full_name, c_prof.phone, 
         o.delivery_address, o.total_amount, o.created_at, v.id, v.business_name, 
         v_prof.phone, v.business_address, v.business_city, v.business_state, v.business_pincode,
         dpo.pickup_otp, dpo.delivery_otp;

-- Create alias view
CREATE OR REPLACE VIEW public.delivery_available_orders AS
SELECT * FROM public.delivery_available_orders_view;

-- Create view for delivery partner orders (what the dashboard expects)
CREATE OR REPLACE VIEW public.delivery_partner_orders_view AS
SELECT 
  dpo.id,
  dpo.order_id,
  o.order_number,
  dpo.delivery_partner_id,
  c_prof.full_name as customer_name,
  c_prof.phone as customer_phone,
  o.delivery_address,
  o.total_amount,
  COUNT(oi.id) as item_count,
  dpo.status,
  dpo.accepted_at,
  dpo.picked_up_at,
  dpo.delivered_at,
  dpo.pickup_otp,
  dpo.delivery_otp,
  dpo.pickup_otp_verified,
  dpo.delivery_otp_verified,
  dpo.delivery_fee,
  v.business_name as vendor_name,
  v_prof.phone as vendor_phone,
  CONCAT(v.business_address, ', ', v.business_city) as vendor_address
FROM public.delivery_partner_orders dpo
JOIN public.orders o ON dpo.order_id = o.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.delivery_partners dp ON dpo.delivery_partner_id = dp.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles c_prof ON c.profile_id = c_prof.id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.profiles v_prof ON v.profile_id = v_prof.id
GROUP BY dpo.id, dpo.order_id, o.order_number, dpo.delivery_partner_id,
         c_prof.full_name, c_prof.phone, o.delivery_address, o.total_amount, dpo.status,
         dpo.accepted_at, dpo.picked_up_at, dpo.delivered_at, dpo.pickup_otp, dpo.delivery_otp,
         dpo.pickup_otp_verified, dpo.delivery_otp_verified, dpo.delivery_fee,
         v.business_name, v_prof.phone, v.business_address, v.business_city;

-- Create essential functions
CREATE OR REPLACE FUNCTION accept_delivery_order(
  p_order_id uuid,
  p_delivery_partner_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_pickup_otp text;
  v_delivery_otp text;
BEGIN
  -- Generate OTPs
  v_pickup_otp := LEFT(md5(random()::text), 6);
  v_delivery_otp := LEFT(md5(random()::text), 6);
  
  -- Check if order is already assigned
  IF EXISTS (SELECT 1 FROM public.delivery_partner_orders WHERE order_id = p_order_id) THEN
    RETURN json_build_object('success', false, 'error', 'Order already assigned');
  END IF;
  
  -- Insert delivery assignment
  INSERT INTO public.delivery_partner_orders (
    order_id, 
    delivery_partner_id, 
    pickup_otp, 
    delivery_otp,
    status
  ) VALUES (
    p_order_id, 
    p_delivery_partner_id, 
    v_pickup_otp, 
    v_delivery_otp,
    'accepted'
  );
  
  -- Update order status
  UPDATE public.orders SET order_status = 'out_for_delivery' WHERE id = p_order_id;
  
  -- Update delivery partner availability
  UPDATE public.delivery_partners SET is_available = false WHERE id = p_delivery_partner_id;
  
  RETURN json_build_object(
    'success', true, 
    'pickup_otp', v_pickup_otp,
    'delivery_otp', v_delivery_otp
  );
END;
$$;

-- Function to mark order as picked up
CREATE OR REPLACE FUNCTION mark_order_picked_up(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_pickup_otp text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify OTP and update status
  UPDATE public.delivery_partner_orders 
  SET 
    status = 'picked_up',
    picked_up_at = now(),
    pickup_otp_verified = true
  WHERE order_id = p_order_id 
    AND delivery_partner_id = p_delivery_partner_id
    AND pickup_otp = p_pickup_otp;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid OTP or order not found');
  END IF;
  
  -- Update order status
  UPDATE public.orders SET order_status = 'picked_up' WHERE id = p_order_id;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Function to mark order as delivered
CREATE OR REPLACE FUNCTION mark_order_delivered(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_delivery_otp text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify OTP and update status
  UPDATE public.delivery_partner_orders 
  SET 
    status = 'delivered',
    delivered_at = now(),
    delivery_otp_verified = true
  WHERE order_id = p_order_id 
    AND delivery_partner_id = p_delivery_partner_id
    AND delivery_otp = p_delivery_otp;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid OTP or order not found');
  END IF;
  
  -- Update order status
  UPDATE public.orders SET order_status = 'delivered' WHERE id = p_order_id;
  UPDATE public.order_items SET item_status = 'delivered' 
  WHERE order_id = p_order_id;
  
  -- Update delivery partner availability
  UPDATE public.delivery_partners SET is_available = true WHERE id = p_delivery_partner_id;
  
  -- Update stats
  INSERT INTO public.delivery_partner_stats (delivery_partner_id, today_deliveries, total_deliveries, today_earnings, total_earnings)
  VALUES (p_delivery_partner_id, 1, 1, 50, 50)
  ON CONFLICT (delivery_partner_id) DO UPDATE SET
    today_deliveries = delivery_partner_stats.today_deliveries + 1,
    total_deliveries = delivery_partner_stats.total_deliveries + 1,
    today_earnings = delivery_partner_stats.today_earnings + 50,
    total_earnings = delivery_partner_stats.total_earnings + 50;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_partners_profile_id ON public.delivery_partners(profile_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partner_orders_order_id ON public.delivery_partner_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partner_orders_delivery_partner_id ON public.delivery_partner_orders(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_partner_orders_status ON public.delivery_partner_orders(status);

-- Enable Row Level Security
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Delivery partners can view their own profile" ON public.delivery_partners
  FOR ALL USING (profile_id = auth.uid());

CREATE POLICY "Delivery partners can view their own orders" ON public.delivery_partner_orders
  FOR ALL USING (
    delivery_partner_id IN (
      SELECT id FROM public.delivery_partners WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Delivery partners can view their own stats" ON public.delivery_partner_stats
  FOR ALL USING (
    delivery_partner_id IN (
      SELECT id FROM public.delivery_partners WHERE profile_id = auth.uid()
    )
  );

-- Delivery Partner Quick Setup - Fixes for Dashboard Issues
-- Run this to fix the immediate delivery partner dashboard problems

-- Step 1: Drop and recreate the delivery_available_orders_view with correct columns
DROP VIEW IF EXISTS public.delivery_available_orders_view CASCADE;
DROP VIEW IF EXISTS public.delivery_available_orders CASCADE;

-- Create the corrected available orders view
CREATE OR REPLACE VIEW public.delivery_available_orders_view AS
SELECT DISTINCT
  o.id as order_id,
  o.order_number,
  o.customer_id,
  c_prof.full_name as customer_name,
  c_prof.phone as customer_phone,
  o.delivery_address,
  o.total_amount,
  COUNT(oi.id) as item_count,
  o.created_at,
  v.id as vendor_id,
  v.business_name as vendor_name,
  v_prof.phone as vendor_phone,
  CONCAT(v.business_address, ', ', v.business_city, ', ', v.business_state, ' - ', v.business_pincode) as vendor_address,
  'available_for_pickup' as status,
  CASE 
    WHEN dpo.pickup_otp IS NOT NULL THEN dpo.pickup_otp
    ELSE LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
  END as pickup_otp,
  CASE 
    WHEN dpo.delivery_otp IS NOT NULL THEN dpo.delivery_otp
    ELSE LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')
  END as delivery_otp,
  null as distance_km,
  null as estimated_time_mins
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.profiles v_prof ON v.profile_id = v_prof.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles c_prof ON c.profile_id = c_prof.id
LEFT JOIN public.delivery_partner_orders dpo ON o.id = dpo.order_id
WHERE o.order_status = 'confirmed'
  AND oi.item_status = 'confirmed'
  AND (dpo.id IS NULL OR dpo.status = 'accepted')
GROUP BY o.id, o.order_number, o.customer_id, c_prof.full_name, c_prof.phone, 
         o.delivery_address, o.total_amount, o.created_at, v.id, v.business_name, 
         v_prof.phone, v.business_address, v.business_city, v.business_state, v.business_pincode,
         dpo.pickup_otp, dpo.delivery_otp;

-- Create alias view
CREATE OR REPLACE VIEW public.delivery_available_orders AS
SELECT * FROM public.delivery_available_orders_view;

-- Step 2: Ensure all existing delivery partners have stats records
INSERT INTO public.delivery_partner_stats (
  delivery_partner_id,
  today_deliveries,
  week_deliveries,
  month_deliveries,
  total_deliveries,
  today_earnings,
  week_earnings,
  month_earnings,
  total_earnings,
  average_rating,
  active_orders,
  stats_date
)
SELECT 
  dp.id,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0.00,
  0,
  CURRENT_DATE
FROM public.delivery_partners dp
LEFT JOIN public.delivery_partner_stats dps ON dp.id = dps.delivery_partner_id
WHERE dps.id IS NULL;

-- Step 3: Create or update the initialize_delivery_partner_stats function
CREATE OR REPLACE FUNCTION initialize_delivery_partner_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Create initial stats record for new delivery partner
  INSERT INTO public.delivery_partner_stats (
    delivery_partner_id,
    today_deliveries,
    week_deliveries,
    month_deliveries,
    total_deliveries,
    today_earnings,
    week_earnings,
    month_earnings,
    total_earnings,
    average_rating,
    active_orders,
    stats_date
  ) VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0.00,
    0,
    CURRENT_DATE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS initialize_delivery_partner_stats_trigger ON public.delivery_partners;
CREATE TRIGGER initialize_delivery_partner_stats_trigger
  AFTER INSERT ON public.delivery_partners
  FOR EACH ROW
  EXECUTE FUNCTION initialize_delivery_partner_stats();

-- Step 5: Create missing delivery partner records for existing delivery_boy profiles
INSERT INTO public.delivery_partners (
  profile_id,
  license_number,
  vehicle_type,
  vehicle_number,
  aadhar_number,
  is_available,
  is_active,
  is_verified,
  total_deliveries,
  rating
)
SELECT 
  p.id,
  'TEMP_LICENSE_' || SUBSTRING(p.id::text, 1, 8), -- Temporary license number
  'bike', -- Default vehicle type
  'TEMP_VEHICLE_' || SUBSTRING(p.id::text, 1, 8), -- Temporary vehicle number
  'TEMP_AADHAR_' || SUBSTRING(p.id::text, 1, 8), -- Temporary aadhar number
  true,
  true,
  false, -- Not verified initially
  0,
  0.00
FROM public.profiles p
LEFT JOIN public.delivery_partners dp ON p.id = dp.profile_id
WHERE p.role = 'delivery_boy' 
  AND dp.id IS NULL;

-- Verify the fix by checking if all required structures exist
DO $$
BEGIN
  -- Check if views exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'delivery_available_orders_view') THEN
    RAISE NOTICE 'WARNING: delivery_available_orders_view does not exist';
  ELSE
    RAISE NOTICE 'SUCCESS: delivery_available_orders_view exists';
  END IF;

  -- Check if stats table has data
  IF EXISTS (SELECT 1 FROM public.delivery_partners dp LEFT JOIN public.delivery_partner_stats dps ON dp.id = dps.delivery_partner_id WHERE dps.id IS NULL) THEN
    RAISE NOTICE 'WARNING: Some delivery partners missing stats records';
  ELSE
    RAISE NOTICE 'SUCCESS: All delivery partners have stats records';
  END IF;
END $$; 