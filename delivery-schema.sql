-- Delivery Partner Schema Extensions for Tryodo Marketplace
-- Add these tables to your existing Supabase database

-- 1. Delivery Boys/Partners Table
CREATE TABLE public.delivery_boys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id),
  name character varying NOT NULL,
  phone character varying NOT NULL UNIQUE,
  email character varying NOT NULL UNIQUE,
  assigned_pincodes text[] DEFAULT '{}',
  status character varying NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'busy', 'offline')),
  current_location jsonb, -- {lat: number, lng: number, address: string, timestamp: string}
  vehicle_type character varying DEFAULT 'bike' CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'cycle')),
  vehicle_number character varying,
  license_number character varying,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_deliveries integer DEFAULT 0,
  successful_deliveries integer DEFAULT 0,
  cancelled_deliveries integer DEFAULT 0,
  average_delivery_time integer DEFAULT 0, -- in minutes
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_boys_pkey PRIMARY KEY (id)
);

-- 2. Delivery Assignments Table
CREATE TABLE public.delivery_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_boy_id uuid NOT NULL REFERENCES public.delivery_boys(id),
  order_ids uuid[] NOT NULL DEFAULT '{}',
  pickup_addresses jsonb NOT NULL, -- Array of pickup locations with vendor details
  delivery_addresses jsonb NOT NULL, -- Array of delivery locations
  total_orders integer NOT NULL DEFAULT 0,
  estimated_distance numeric, -- in kilometers
  estimated_time integer, -- in minutes
  actual_distance numeric,
  actual_time integer,
  status character varying NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed')),
  priority character varying DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  pickup_started_at timestamp with time zone,
  pickup_completed_at timestamp with time zone,
  delivery_started_at timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  delivery_instructions text,
  special_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_assignments_pkey PRIMARY KEY (id)
);

-- 3. Order Tracking Table
CREATE TABLE public.order_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  delivery_assignment_id uuid REFERENCES public.delivery_assignments(id),
  status character varying NOT NULL,
  location jsonb, -- {lat: number, lng: number, address: string}
  timestamp timestamp with time zone DEFAULT now(),
  notes text,
  image_url text, -- For proof of delivery, pickup photos
  customer_signature text, -- Base64 encoded signature
  delivery_boy_id uuid REFERENCES public.delivery_boys(id),
  estimated_arrival timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_tracking_pkey PRIMARY KEY (id)
);

-- 4. Delivery Pricing Table
CREATE TABLE public.delivery_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pincode character varying NOT NULL,
  city character varying,
  state character varying,
  base_price numeric NOT NULL DEFAULT 0,
  per_km_price numeric DEFAULT 0,
  order_value_ranges jsonb, -- [{min: 0, max: 500, price: 50}, {min: 500, max: 1000, price: 30}]
  pricing_rules jsonb, -- Additional rules like time-based pricing, surge pricing
  free_delivery_threshold numeric DEFAULT 0, -- Free delivery above this order value
  max_delivery_distance numeric DEFAULT 50, -- Maximum delivery distance in km
  is_active boolean DEFAULT true,
  effective_from timestamp with time zone DEFAULT now(),
  effective_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_pricing_pkey PRIMARY KEY (id)
);

-- 5. Delivery Reviews Table
CREATE TABLE public.delivery_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  delivery_boy_id uuid NOT NULL REFERENCES public.delivery_boys(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  delivery_time_rating integer CHECK (delivery_time_rating >= 1 AND delivery_time_rating <= 5),
  packaging_rating integer CHECK (packaging_rating >= 1 AND packaging_rating <= 5),
  behavior_rating integer CHECK (behavior_rating >= 1 AND behavior_rating <= 5),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_reviews_unique_order UNIQUE (order_id)
);

-- 6. Delivery Zones Table
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  pincodes text[] NOT NULL DEFAULT '{}',
  polygon_coordinates jsonb, -- GeoJSON polygon for complex zones
  is_serviceable boolean DEFAULT true,
  delivery_time_slots jsonb, -- Available delivery time slots
  special_instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_zones_pkey PRIMARY KEY (id)
);

-- Modify existing orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_boy_id uuid REFERENCES public.delivery_boys(id),
ADD COLUMN IF NOT EXISTS pickup_status character varying DEFAULT 'pending' CHECK (pickup_status IN ('pending', 'assigned', 'picked_up', 'failed')),
ADD COLUMN IF NOT EXISTS delivery_status character varying DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'assigned', 'out_for_delivery', 'delivered', 'failed', 'returned')),
ADD COLUMN IF NOT EXISTS tracking_id character varying UNIQUE,
ADD COLUMN IF NOT EXISTS delivery_instructions text,
ADD COLUMN IF NOT EXISTS preferred_delivery_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pickup_address jsonb,
ADD COLUMN IF NOT EXISTS delivery_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_delivery_attempt timestamp with time zone;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_boys_status ON public.delivery_boys(status);
CREATE INDEX IF NOT EXISTS idx_delivery_boys_pincodes ON public.delivery_boys USING GIN(assigned_pincodes);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_delivery_boy ON public.delivery_assignments(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON public.delivery_assignments(status);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON public.order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_timestamp ON public.order_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_delivery_pricing_pincode ON public.delivery_pricing(pincode);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_boy ON public.orders(delivery_boy_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON public.orders(tracking_id);

-- Create sequence for tracking IDs
CREATE SEQUENCE IF NOT EXISTS tracking_id_sequence START 1000000;

-- Function to generate tracking ID
CREATE OR REPLACE FUNCTION generate_tracking_id()
RETURNS text AS $$
BEGIN
  RETURN 'TRK' || to_char(now(), 'YYYYMMDD') || lpad(nextval('tracking_id_sequence')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate tracking ID for orders
CREATE OR REPLACE FUNCTION set_tracking_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.tracking_id IS NULL THEN
    NEW.tracking_id := generate_tracking_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_tracking_id
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION set_tracking_id();

-- Function to update delivery boy stats
CREATE OR REPLACE FUNCTION update_delivery_boy_stats()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE public.delivery_boys 
    SET 
      total_deliveries = total_deliveries + 1,
      successful_deliveries = successful_deliveries + 1,
      updated_at = now()
    WHERE id = NEW.delivery_boy_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.delivery_boys 
    SET 
      cancelled_deliveries = cancelled_deliveries + 1,
      updated_at = now()
    WHERE id = NEW.delivery_boy_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_stats
  AFTER UPDATE ON public.delivery_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_boy_stats();

-- RLS Policies for delivery tables
ALTER TABLE public.delivery_boys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Delivery boys can only see their own data
CREATE POLICY "Delivery boys can view own data" ON public.delivery_boys
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Delivery boys can update own data" ON public.delivery_boys
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Delivery assignments policies
CREATE POLICY "Delivery boys can view own assignments" ON public.delivery_assignments
  FOR SELECT USING (delivery_boy_id IN (
    SELECT id FROM public.delivery_boys WHERE profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Delivery boys can update own assignments" ON public.delivery_assignments
  FOR UPDATE USING (delivery_boy_id IN (
    SELECT id FROM public.delivery_boys WHERE profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  ));

-- Order tracking policies
CREATE POLICY "Users can view order tracking" ON public.order_tracking
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE customer_id IN (
        SELECT id FROM public.customers WHERE profile_id IN (
          SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
      )
    ) OR
    delivery_boy_id IN (
      SELECT id FROM public.delivery_boys WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Public read access for delivery pricing and zones
CREATE POLICY "Public can view delivery pricing" ON public.delivery_pricing
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view delivery zones" ON public.delivery_zones
  FOR SELECT USING (is_serviceable = true);

-- Sample data for testing
INSERT INTO public.delivery_zones (name, pincodes, is_serviceable, delivery_time_slots) VALUES
('Central Delhi', ARRAY['110001', '110002', '110003'], true, 
 '[{"slot": "9:00-12:00", "available": true}, {"slot": "12:00-15:00", "available": true}, {"slot": "15:00-18:00", "available": true}]'::jsonb),
('South Delhi', ARRAY['110016', '110017', '110019'], true,
 '[{"slot": "10:00-13:00", "available": true}, {"slot": "13:00-16:00", "available": true}, {"slot": "16:00-19:00", "available": true}]'::jsonb);

INSERT INTO public.delivery_pricing (pincode, city, state, base_price, per_km_price, order_value_ranges, free_delivery_threshold) VALUES
('110001', 'Delhi', 'Delhi', 50, 10, 
 '[{"min": 0, "max": 500, "price": 50}, {"min": 500, "max": 1000, "price": 30}, {"min": 1000, "max": 9999999, "price": 0}]'::jsonb, 1000),
('110016', 'Delhi', 'Delhi', 60, 12,
 '[{"min": 0, "max": 500, "price": 60}, {"min": 500, "max": 1000, "price": 40}, {"min": 1000, "max": 9999999, "price": 0}]'::jsonb, 1000); 