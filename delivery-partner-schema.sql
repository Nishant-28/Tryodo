-- Delivery Partner System Schema Extension
-- This extends the existing Supabase schema to support delivery partner functionality

-- First, update the profiles table to include delivery_boy role
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['customer'::text, 'vendor'::text, 'admin'::text, 'delivery_boy'::text]));

-- Delivery Partners Table
CREATE TABLE public.delivery_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  license_number character varying NOT NULL,
  vehicle_type character varying NOT NULL CHECK (vehicle_type = ANY (ARRAY['bike', 'scooter', 'bicycle', 'car', 'auto'])),
  vehicle_number character varying NOT NULL,
  aadhar_number character varying NOT NULL,
  pan_number character varying,
  bank_account_number character varying,
  bank_ifsc_code character varying,
  emergency_contact_name character varying,
  emergency_contact_phone character varying,
  current_latitude numeric,
  current_longitude numeric,
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  rating numeric DEFAULT 0.00 CHECK (rating >= 0::numeric AND rating <= 5::numeric),
  total_reviews integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  joined_at timestamp with time zone DEFAULT now(),
  last_location_update timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partners_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partners_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

-- Delivery Partner Orders (Assignment Table)
CREATE TABLE public.delivery_partner_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  delivery_partner_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'accepted' CHECK (status = ANY (ARRAY['accepted', 'picked_up', 'delivered', 'cancelled'])),
  accepted_at timestamp with time zone DEFAULT now(),
  picked_up_at timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  pickup_otp character varying(6) NOT NULL,
  delivery_otp character varying(6) NOT NULL,
  pickup_otp_verified boolean DEFAULT false,
  delivery_otp_verified boolean DEFAULT false,
  delivery_fee numeric DEFAULT 0,
  distance_km numeric,
  delivery_time_minutes integer,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partner_orders_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT delivery_partner_orders_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id),
  CONSTRAINT unique_order_assignment UNIQUE (order_id)
);

-- Delivery Partner Stats
CREATE TABLE public.delivery_partner_stats (
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
  last_delivery_at timestamp with time zone,
  stats_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partner_stats_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_stats_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);

-- Delivery Reviews
CREATE TABLE public.delivery_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_partner_order_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  delivery_partner_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  timeliness_rating integer CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  professionalism_rating integer CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
  is_anonymous boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_reviews_delivery_partner_order_id_fkey FOREIGN KEY (delivery_partner_order_id) REFERENCES public.delivery_partner_orders(id),
  CONSTRAINT delivery_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT delivery_reviews_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);

-- Create Views for easy data retrieval

-- Available Orders View (for delivery partners to see)
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
  COALESCE(dpo.pickup_otp, generate_otp()) as pickup_otp,
  COALESCE(dpo.delivery_otp, generate_otp()) as delivery_otp,
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

-- Create an alias view with the exact name the Dashboard expects
CREATE OR REPLACE VIEW public.delivery_available_orders AS
SELECT * FROM public.delivery_available_orders_view;

-- Delivery Partner Orders View
CREATE OR REPLACE VIEW public.delivery_partner_orders_view AS
SELECT 
  dpo.id,
  dpo.order_id,
  o.order_number,
  dpo.delivery_partner_id,
  dp_prof.full_name as delivery_partner_name,
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
  dpo.distance_km,
  dpo.delivery_time_minutes,
  v.business_name as vendor_name,
  v_prof.phone as vendor_phone,
  CONCAT(v.business_address, ', ', v.business_city, ', ', v.business_state, ' - ', v.business_pincode) as vendor_address
FROM public.delivery_partner_orders dpo
JOIN public.orders o ON dpo.order_id = o.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.delivery_partners dp ON dpo.delivery_partner_id = dp.id
JOIN public.profiles dp_prof ON dp.profile_id = dp_prof.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles c_prof ON c.profile_id = c_prof.id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.profiles v_prof ON v.profile_id = v_prof.id
GROUP BY dpo.id, dpo.order_id, o.order_number, dpo.delivery_partner_id, dp_prof.full_name,
         c_prof.full_name, c_prof.phone, o.delivery_address, o.total_amount, dpo.status,
         dpo.accepted_at, dpo.picked_up_at, dpo.delivered_at, dpo.pickup_otp, dpo.delivery_otp,
         dpo.pickup_otp_verified, dpo.delivery_otp_verified, dpo.delivery_fee, dpo.distance_km,
         dpo.delivery_time_minutes, v.business_name, v_prof.phone, v.business_address,
         v.business_city, v.business_state, v.business_pincode;

-- Delivery History View
CREATE OR REPLACE VIEW public.delivery_history_view AS
SELECT 
  dpo.id,
  dpo.order_id,
  o.order_number,
  dpo.delivery_partner_id,
  c_prof.full_name as customer_name,
  o.delivery_address,
  o.total_amount,
  dpo.status,
  dpo.delivered_at,
  dpo.delivery_fee,
  dpo.distance_km,
  dpo.delivery_time_minutes,
  v.business_name as vendor_name,
  dr.rating as delivery_rating
FROM public.delivery_partner_orders dpo
JOIN public.orders o ON dpo.order_id = o.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles c_prof ON c.profile_id = c_prof.id
JOIN public.vendors v ON oi.vendor_id = v.id
LEFT JOIN public.delivery_reviews dr ON dpo.id = dr.delivery_partner_order_id
WHERE dpo.status = 'delivered'
GROUP BY dpo.id, dpo.order_id, o.order_number, dpo.delivery_partner_id, c_prof.full_name,
         o.delivery_address, o.total_amount, dpo.status, dpo.delivered_at, dpo.delivery_fee,
         dpo.distance_km, dpo.delivery_time_minutes, v.business_name, dr.rating;

-- Functions for delivery operations

-- Function to generate random 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS character varying AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to accept delivery order
CREATE OR REPLACE FUNCTION accept_delivery_order(
  p_order_id uuid,
  p_delivery_partner_id uuid
)
RETURNS json AS $$
DECLARE
  v_pickup_otp varchar(6);
  v_delivery_otp varchar(6);
  v_result json;
BEGIN
  -- Check if order is available for pickup
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id 
      AND o.order_status = 'confirmed'
      AND o.id NOT IN (SELECT order_id FROM public.delivery_partner_orders)
  ) THEN
    RAISE EXCEPTION 'Order not available for pickup';
  END IF;

  -- Check if delivery partner is available
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_partners dp
    WHERE dp.id = p_delivery_partner_id 
      AND dp.is_available = true 
      AND dp.is_active = true
  ) THEN
    RAISE EXCEPTION 'Delivery partner not available';
  END IF;

  -- Generate OTPs
  v_pickup_otp := generate_otp();
  v_delivery_otp := generate_otp();

  -- Create delivery assignment
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
  UPDATE public.orders 
  SET order_status = 'out_for_delivery',
      updated_at = now()
  WHERE id = p_order_id;

  -- Update delivery partner stats
  UPDATE public.delivery_partner_stats 
  SET active_orders = active_orders + 1,
      updated_at = now()
  WHERE delivery_partner_id = p_delivery_partner_id;

  -- Update delivery partner availability
  UPDATE public.delivery_partners 
  SET is_available = false,
      updated_at = now()
  WHERE id = p_delivery_partner_id;

  v_result := json_build_object(
    'success', true,
    'message', 'Order accepted successfully',
    'pickup_otp', v_pickup_otp,
    'delivery_otp', v_delivery_otp
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to mark order as picked up
CREATE OR REPLACE FUNCTION mark_order_picked_up(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_pickup_otp character varying
)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  -- Verify OTP and update status
  UPDATE public.delivery_partner_orders 
  SET status = 'picked_up',
      picked_up_at = now(),
      pickup_otp_verified = true,
      updated_at = now()
  WHERE order_id = p_order_id 
    AND delivery_partner_id = p_delivery_partner_id
    AND pickup_otp = p_pickup_otp
    AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid OTP or order not found';
  END IF;

  -- Update order status
  UPDATE public.orders 
  SET order_status = 'picked_up',
      picked_up_date = now(),
      updated_at = now()
  WHERE id = p_order_id;

  -- Update order items status
  UPDATE public.order_items 
  SET item_status = 'picked_up',
      picked_up_at = now(),
      updated_at = now()
  WHERE order_id = p_order_id;

  v_result := json_build_object(
    'success', true,
    'message', 'Order marked as picked up successfully'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to mark order as delivered
CREATE OR REPLACE FUNCTION mark_order_delivered(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_delivery_otp character varying
)
RETURNS json AS $$
DECLARE
  v_delivery_fee numeric := 50; -- Default delivery fee
  v_result json;
BEGIN
  -- Verify OTP and update status
  UPDATE public.delivery_partner_orders 
  SET status = 'delivered',
      delivered_at = now(),
      delivery_otp_verified = true,
      delivery_fee = v_delivery_fee,
      updated_at = now()
  WHERE order_id = p_order_id 
    AND delivery_partner_id = p_delivery_partner_id
    AND delivery_otp = p_delivery_otp
    AND status = 'picked_up';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid OTP or order not in pickup state';
  END IF;

  -- Update order status
  UPDATE public.orders 
  SET order_status = 'delivered',
      actual_delivery_date = now(),
      updated_at = now()
  WHERE id = p_order_id;

  -- Update order items status
  UPDATE public.order_items 
  SET item_status = 'delivered',
      updated_at = now()
  WHERE order_id = p_order_id;

  -- Update delivery partner stats
  UPDATE public.delivery_partner_stats 
  SET today_deliveries = today_deliveries + 1,
      total_deliveries = total_deliveries + 1,
      today_earnings = today_earnings + v_delivery_fee,
      total_earnings = total_earnings + v_delivery_fee,
      active_orders = active_orders - 1,
      last_delivery_at = now(),
      updated_at = now()
  WHERE delivery_partner_id = p_delivery_partner_id;

  -- Update delivery partner total deliveries
  UPDATE public.delivery_partners 
  SET total_deliveries = total_deliveries + 1,
      is_available = true,
      updated_at = now()
  WHERE id = p_delivery_partner_id;

  v_result := json_build_object(
    'success', true,
    'message', 'Order delivered successfully',
    'delivery_fee', v_delivery_fee
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to update delivery partner location
CREATE OR REPLACE FUNCTION update_delivery_partner_location(
  p_delivery_partner_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE public.delivery_partners 
  SET current_latitude = p_latitude,
      current_longitude = p_longitude,
      last_location_update = now(),
      updated_at = now()
  WHERE id = p_delivery_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery partner not found';
  END IF;

  v_result := json_build_object(
    'success', true,
    'message', 'Location updated successfully'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate delivery earnings
CREATE OR REPLACE FUNCTION calculate_delivery_earnings(
  p_delivery_partner_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS json AS $$
DECLARE
  v_total_earnings numeric := 0;
  v_total_deliveries integer := 0;
  v_result json;
BEGIN
  SELECT 
    COALESCE(SUM(delivery_fee), 0),
    COUNT(*)
  INTO v_total_earnings, v_total_deliveries
  FROM public.delivery_partner_orders dpo
  WHERE dpo.delivery_partner_id = p_delivery_partner_id
    AND dpo.status = 'delivered'
    AND DATE(dpo.delivered_at) BETWEEN p_start_date AND p_end_date;

  v_result := json_build_object(
    'total_earnings', v_total_earnings,
    'total_deliveries', v_total_deliveries,
    'average_per_delivery', CASE WHEN v_total_deliveries > 0 THEN v_total_earnings / v_total_deliveries ELSE 0 END,
    'start_date', p_start_date,
    'end_date', p_end_date
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize delivery partner stats
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

-- Trigger to initialize stats when delivery partner is created
CREATE TRIGGER initialize_delivery_partner_stats_trigger
  AFTER INSERT ON public.delivery_partners
  FOR EACH ROW
  EXECUTE FUNCTION initialize_delivery_partner_stats();

-- Indexes for better performance
CREATE INDEX idx_delivery_partners_profile_id ON public.delivery_partners(profile_id);
CREATE INDEX idx_delivery_partners_is_available ON public.delivery_partners(is_available, is_active);
CREATE INDEX idx_delivery_partner_orders_order_id ON public.delivery_partner_orders(order_id);
CREATE INDEX idx_delivery_partner_orders_delivery_partner_id ON public.delivery_partner_orders(delivery_partner_id);
CREATE INDEX idx_delivery_partner_orders_status ON public.delivery_partner_orders(status);
CREATE INDEX idx_delivery_partner_stats_delivery_partner_id ON public.delivery_partner_stats(delivery_partner_id);

-- Triggers to auto-update stats
CREATE OR REPLACE FUNCTION update_delivery_partner_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize stats if doesn't exist
  INSERT INTO public.delivery_partner_stats (delivery_partner_id)
  VALUES (NEW.delivery_partner_id)
  ON CONFLICT (delivery_partner_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_partner_stats_trigger
  AFTER INSERT ON public.delivery_partner_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_partner_stats_trigger();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_reviews ENABLE ROW LEVEL SECURITY;

-- Delivery partners can only see their own data
CREATE POLICY delivery_partners_own_data ON public.delivery_partners
  FOR ALL USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Delivery partner orders policies
CREATE POLICY delivery_partner_orders_own_data ON public.delivery_partner_orders
  FOR ALL USING (
    delivery_partner_id = (
      SELECT dp.id FROM public.delivery_partners dp 
      JOIN public.profiles p ON dp.profile_id = p.id 
      WHERE p.user_id = auth.uid()
    )
  );

-- Delivery partner stats policies
CREATE POLICY delivery_partner_stats_own_data ON public.delivery_partner_stats
  FOR ALL USING (
    delivery_partner_id = (
      SELECT dp.id FROM public.delivery_partners dp 
      JOIN public.profiles p ON dp.profile_id = p.id 
      WHERE p.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;