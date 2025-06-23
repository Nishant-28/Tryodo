-- ============================================================================
-- TRYODO ELECTRONICS MARKETPLACE - COMPREHENSIVE SCHEMA
-- ============================================================================
-- This schema supports the complete app flow:
-- Order Placed → Vendor Confirms → Delivery Assigned → OTPs Generated → 
-- Pickup → Delivery → Completion
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'vendor', 'delivery_partner', 'admin')),
  full_name text,
  phone varchar(15),
  address text,
  city varchar(100),
  state varchar(100),
  pincode varchar(10),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- BUSINESS ENTITIES
-- ============================================================================

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  date_of_birth date,
  gender varchar(10) CHECK (gender IN ('male', 'female', 'other')),
  total_orders integer DEFAULT 0,
  total_spent numeric(12,2) DEFAULT 0,
  last_order_date timestamp with time zone,
  preferred_delivery_address jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Vendors/Businesses
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  business_name varchar(200) NOT NULL,
  business_registration varchar(100),
  gstin varchar(15),
  business_address text,
  business_city varchar(100),
  business_state varchar(100),
  business_pincode varchar(10),
  contact_person varchar(200),
  contact_phone varchar(15),
  business_email varchar(255),
  rating numeric(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer DEFAULT 0,
  total_sales integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Order Management Settings
  auto_approve_orders boolean DEFAULT false,
  order_confirmation_timeout_minutes integer DEFAULT 15,
  auto_approve_under_amount numeric(10,2),
  business_hours_start time DEFAULT '09:00:00',
  business_hours_end time DEFAULT '18:00:00',
  auto_approve_during_business_hours_only boolean DEFAULT true,
  
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Delivery Partners
CREATE TABLE public.delivery_partners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  license_number varchar(50) NOT NULL,
  vehicle_type varchar(20) NOT NULL CHECK (vehicle_type IN ('bike', 'scooter', 'bicycle', 'car', 'auto')),
  vehicle_number varchar(20) NOT NULL,
  aadhar_number varchar(12) NOT NULL,
  pan_number varchar(10),
  bank_account_number varchar(20),
  bank_ifsc_code varchar(11),
  emergency_contact_name varchar(200),
  emergency_contact_phone varchar(15),
  
  -- Location and availability
  current_latitude numeric(10,8),
  current_longitude numeric(11,8),
  assigned_pincodes text[] DEFAULT '{}',
  is_available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  
  -- Performance metrics
  rating numeric(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  successful_deliveries integer DEFAULT 0,
  cancelled_deliveries integer DEFAULT 0,
  average_delivery_time_minutes integer DEFAULT 0,
  
  joined_at timestamp with time zone DEFAULT now(),
  last_location_update timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- PRODUCT CATALOG
-- ============================================================================

-- Product Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL UNIQUE,
  description text,
  icon varchar(50),
  gradient varchar(100),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Quality Categories (condition types)
CREATE TABLE public.quality_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL, -- e.g., "Brand New", "Refurbished", "Used - Good"
  description text,
  sort_order integer DEFAULT 0,
  color_code varchar(7) DEFAULT '#6B7280',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Brands
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL UNIQUE,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Smartphone Models
CREATE TABLE public.smartphone_models (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  model_name varchar(200) NOT NULL,
  model_number varchar(100),
  release_year integer,
  base_price numeric(10,2),
  specifications jsonb,
  official_images text[],
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Generic Products (non-model specific)
CREATE TABLE public.generic_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  name varchar(200) NOT NULL,
  description text,
  specifications jsonb,
  official_images text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Vendor Products (model-specific)
CREATE TABLE public.vendor_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  model_id uuid NOT NULL REFERENCES public.smartphone_models(id),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  quality_type_id uuid NOT NULL REFERENCES public.quality_categories(id),
  
  -- Pricing
  price numeric(10,2) NOT NULL CHECK (price > 0),
  original_price numeric(10,2),
  discount_percentage integer GENERATED ALWAYS AS (
    CASE 
      WHEN original_price > 0 AND price < original_price 
      THEN ROUND(((original_price - price) / original_price * 100)::numeric, 0)::integer
      ELSE 0 
    END
  ) STORED,
  
  -- Inventory
  stock_quantity integer NOT NULL DEFAULT 0,
  is_in_stock boolean GENERATED ALWAYS AS (stock_quantity > 0) STORED,
  low_stock_threshold integer DEFAULT 5,
  
  -- Product details
  warranty_months integer DEFAULT 0,
  delivery_time_days integer DEFAULT 3,
  product_images text[],
  specifications jsonb,
  vendor_notes text,
  
  -- Status
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Vendor Generic Products (non-model specific)
CREATE TABLE public.vendor_generic_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  generic_product_id uuid NOT NULL REFERENCES public.generic_products(id),
  quality_type_id uuid NOT NULL REFERENCES public.quality_categories(id),
  
  -- Pricing (same structure as vendor_products)
  price numeric(10,2) NOT NULL CHECK (price > 0),
  original_price numeric(10,2),
  discount_percentage integer GENERATED ALWAYS AS (
    CASE 
      WHEN original_price > 0 AND price < original_price 
      THEN ROUND(((original_price - price) / original_price * 100)::numeric, 0)::integer
      ELSE 0 
    END
  ) STORED,
  
  -- Inventory
  stock_quantity integer NOT NULL DEFAULT 0,
  is_in_stock boolean GENERATED ALWAYS AS (stock_quantity > 0) STORED,
  low_stock_threshold integer DEFAULT 5,
  
  -- Product details
  warranty_months integer DEFAULT 0,
  delivery_time_days integer DEFAULT 3,
  product_images text[],
  specifications jsonb,
  vendor_notes text,
  
  -- Status
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- ORDER MANAGEMENT SYSTEM
-- ============================================================================

-- Main Orders Table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number varchar(50) NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  
  -- Address information
  delivery_address jsonb NOT NULL,
  
  -- Pricing
  subtotal numeric(12,2) NOT NULL,
  shipping_charges numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(12,2) NOT NULL,
  
  -- Status tracking
  order_status varchar(30) NOT NULL DEFAULT 'pending' CHECK (
    order_status IN (
      'pending', 'confirmed', 'processing', 'packed', 
      'picked_up', 'out_for_delivery', 'delivered', 
      'cancelled', 'returned', 'refunded'
    )
  ),
  
  -- Payment information
  payment_status varchar(20) NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded')
  ),
  payment_method varchar(50),
  payment_id varchar(100),
  
  -- Delivery information
  estimated_delivery_date date,
  actual_delivery_date timestamp with time zone,
  delivery_instructions text,
  preferred_delivery_time timestamp with time zone,
  delivery_attempts integer DEFAULT 0,
  last_delivery_attempt timestamp with time zone,
  
  -- Additional information
  special_instructions text,
  notes text,
  cancelled_date timestamp with time zone,
  cancellation_reason text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Order Items (individual products in an order)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  
  -- Product reference (either vendor_product_id OR vendor_generic_product_id)
  vendor_product_id uuid REFERENCES public.vendor_products(id),
  vendor_generic_product_id uuid REFERENCES public.vendor_generic_products(id),
  
  -- Product details (stored at time of order)
  product_name varchar(200) NOT NULL,
  product_description text,
  category_name varchar(100),
  quality_type_name varchar(100),
  
  -- Pricing
  unit_price numeric(10,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  line_total numeric(12,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  
  -- Item-specific status
  item_status varchar(30) NOT NULL DEFAULT 'pending' CHECK (
    item_status IN (
      'pending', 'confirmed', 'processing', 'packed',
      'picked_up', 'shipped', 'delivered', 'cancelled', 
      'returned', 'refunded'
    )
  ),
  
  -- Vendor interaction
  vendor_confirmed_at timestamp with time zone,
  vendor_notes text,
  picked_up_at timestamp with time zone,
  pickup_confirmed_by varchar(200),
  
  -- Product details
  warranty_months integer DEFAULT 0,
  estimated_delivery_days integer DEFAULT 3,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Ensure only one product type is referenced
  CONSTRAINT order_items_product_check 
    CHECK ((vendor_product_id IS NOT NULL)::integer + (vendor_generic_product_id IS NOT NULL)::integer = 1)
);

-- ============================================================================
-- DELIVERY SYSTEM (CORE OF THE APP FLOW)
-- ============================================================================

-- Delivery Partner Orders (the heart of the delivery flow)
CREATE TABLE public.delivery_partner_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) UNIQUE,
  delivery_partner_id uuid NOT NULL REFERENCES public.delivery_partners(id),
  
  -- Status tracking through the delivery flow
  status varchar(20) NOT NULL DEFAULT 'assigned' CHECK (
    status IN ('assigned', 'accepted', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'failed')
  ),
  
  -- OTP System (Critical for the flow)
  pickup_otp varchar(6) NOT NULL,
  delivery_otp varchar(6) NOT NULL,
  pickup_otp_verified boolean DEFAULT false,
  delivery_otp_verified boolean DEFAULT false,
  pickup_otp_verified_at timestamp with time zone,
  delivery_otp_verified_at timestamp with time zone,
  
  -- Timestamps for each stage
  assigned_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  pickup_started_at timestamp with time zone,
  picked_up_at timestamp with time zone,
  delivery_started_at timestamp with time zone,
  delivered_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  failed_at timestamp with time zone,
  
  -- Additional information
  cancellation_reason text,
  failure_reason text,
  delivery_fee numeric(8,2) DEFAULT 0,
  distance_km numeric(8,2),
  estimated_delivery_time_minutes integer,
  actual_delivery_time_minutes integer,
  
  -- Location tracking
  pickup_location jsonb,
  delivery_location jsonb,
  current_location jsonb,
  
  -- Notes and special instructions
  pickup_instructions text,
  delivery_instructions text,
  notes text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Order Status History (track all status changes)
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_item_id uuid REFERENCES public.order_items(id),
  delivery_partner_order_id uuid REFERENCES public.delivery_partner_orders(id),
  
  -- Status change details
  previous_status varchar(30),
  new_status varchar(30) NOT NULL,
  status_type varchar(20) NOT NULL CHECK (status_type IN ('order', 'item', 'delivery')),
  
  -- Who made the change
  changed_by_user_id uuid REFERENCES auth.users(id),
  changed_by_role varchar(20),
  change_reason text,
  
  -- Additional data
  metadata jsonb,
  location jsonb,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Delivery Location Tracking
CREATE TABLE public.delivery_tracking (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_partner_order_id uuid NOT NULL REFERENCES public.delivery_partner_orders(id),
  delivery_partner_id uuid NOT NULL REFERENCES public.delivery_partners(id),
  
  -- Location data
  latitude numeric(10,8) NOT NULL,
  longitude numeric(11,8) NOT NULL,
  address text,
  accuracy_meters numeric(8,2),
  
  -- Status at this location
  tracking_status varchar(30) NOT NULL,
  notes text,
  
  -- Speed and direction (if needed)
  speed_kmh numeric(6,2),
  bearing_degrees integer,
  
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- SUPPORTING TABLES
-- ============================================================================

-- Customer Addresses
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  address_type varchar(20) NOT NULL DEFAULT 'home' CHECK (address_type IN ('home', 'work', 'other')),
  
  -- Address details
  address_line1 varchar(200) NOT NULL,
  address_line2 varchar(200),
  city varchar(100) NOT NULL,
  state varchar(100) NOT NULL,
  pincode varchar(10) NOT NULL,
  landmark varchar(200),
  
  -- Contact information
  contact_name varchar(200),
  contact_phone varchar(15),
  
  -- Status
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Delivery Zones and Pricing
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  pincodes text[] NOT NULL DEFAULT '{}',
  is_serviceable boolean DEFAULT true,
  
  -- Pricing
  base_delivery_fee numeric(8,2) DEFAULT 0,
  per_km_rate numeric(6,2) DEFAULT 0,
  free_delivery_threshold numeric(10,2) DEFAULT 0,
  
  -- Service parameters
  max_delivery_distance_km numeric(8,2) DEFAULT 50,
  estimated_delivery_time_minutes integer DEFAULT 60,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- SEQUENCES AND TRIGGERS
-- ============================================================================

-- Order number sequence
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
BEGIN
  RETURN 'ORD' || to_char(now(), 'YYYYMMDD') || lpad(nextval('order_sequence')::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS varchar(6) AS $$
BEGIN
  RETURN lpad(floor(random() * 1000000)::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to set order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Trigger to generate OTPs for delivery assignments
CREATE OR REPLACE FUNCTION set_delivery_otps()
RETURNS trigger AS $$
BEGIN
  IF NEW.pickup_otp IS NULL OR NEW.pickup_otp = '' THEN
    NEW.pickup_otp := generate_otp();
  END IF;
  IF NEW.delivery_otp IS NULL OR NEW.delivery_otp = '' THEN
    NEW.delivery_otp := generate_otp();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_delivery_otps ON public.delivery_partner_orders;
CREATE TRIGGER trigger_set_delivery_otps
  BEFORE INSERT ON public.delivery_partner_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_delivery_otps();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have updated_at column
DO $$
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT LIKE '%_history'
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = tbl_name 
      AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_updated_at ON public.%I', tbl_name);
      EXECUTE format('CREATE TRIGGER trigger_update_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()', tbl_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- VIEWS FOR DASHBOARD AND APPLICATION USE
-- ============================================================================

-- Vendor Pending Orders View
CREATE OR REPLACE VIEW public.vendor_pending_orders AS
SELECT 
  oi.id as order_item_id,
  oi.order_id,
  o.order_number,
  o.customer_id,
  o.total_amount,
  o.order_status,
  o.payment_status,
  o.delivery_address,
  o.created_at,
  
  -- Order item details
  oi.vendor_id,
  oi.product_name,
  oi.product_description,
  oi.unit_price,
  oi.quantity,
  oi.line_total,
  oi.item_status,
  
  -- Vendor business settings
  v.business_name as vendor_business_name,
  v.auto_approve_orders,
  v.order_confirmation_timeout_minutes,
  v.auto_approve_under_amount,
  v.business_hours_start,
  v.business_hours_end,
  v.auto_approve_during_business_hours_only,
  
  -- Customer profile
  p.id as customer_profile_id,
  
  -- Calculated fields
  GREATEST(0, v.order_confirmation_timeout_minutes - EXTRACT(EPOCH FROM (now() - o.created_at))/60)::integer as minutes_remaining,
  
  -- Auto-approval logic
  CASE 
    WHEN v.auto_approve_orders = true
      AND (v.auto_approve_under_amount IS NULL OR oi.line_total <= v.auto_approve_under_amount)
      AND (v.auto_approve_during_business_hours_only = false 
           OR (CURRENT_TIME BETWEEN v.business_hours_start AND v.business_hours_end))
    THEN true
    ELSE false
  END as should_auto_approve
  
FROM public.order_items oi
JOIN public.orders o ON oi.order_id = o.id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles p ON c.profile_id = p.id
WHERE oi.item_status = 'pending'
  AND o.order_status = 'pending'
  AND v.is_active = true;

-- Vendor Confirmed Orders View (for delivery tracking)
CREATE OR REPLACE VIEW public.vendor_confirmed_orders AS
SELECT 
  -- Order item info
  oi.id as item_id,
  oi.order_id,
  o.order_number,
  o.customer_id,
  o.delivery_address,
  o.created_at as order_date,
  o.total_amount,
  o.order_status,
  o.payment_status,
  
  -- Item details
  oi.vendor_id,
  oi.product_name,
  oi.product_description,
  oi.unit_price,
  oi.quantity,
  oi.line_total,
  oi.item_status,
  oi.picked_up_at,
  oi.pickup_confirmed_by,
  oi.vendor_notes,
  oi.updated_at,
  
  -- Customer info
  cp.full_name as customer_name,
  cp.phone as customer_phone,
  
  -- Delivery partner info
  dpo.delivery_partner_id,
  dp.full_name as delivery_partner_name,
  dp.phone as delivery_partner_phone,
  dpo.pickup_otp,
  dpo.delivery_otp,
  dpo.status as delivery_status,
  dpo.accepted_at as delivery_assigned_at,
  dpo.picked_up_at as delivery_picked_up_at,
  dpo.delivered_at,
  
  -- Delivery tracking
  CASE 
    WHEN dpo.delivered_at IS NOT NULL THEN 'delivered'
    WHEN dpo.picked_up_at IS NOT NULL THEN 'out_for_delivery'
    WHEN dpo.accepted_at IS NOT NULL THEN 'assigned_to_delivery'
    ELSE 'confirmed'
  END as current_status

FROM public.order_items oi
JOIN public.orders o ON oi.order_id = o.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles cp ON c.profile_id = cp.id
LEFT JOIN public.delivery_partner_orders dpo ON o.id = dpo.order_id
LEFT JOIN public.delivery_partners dp_entity ON dpo.delivery_partner_id = dp_entity.id
LEFT JOIN public.profiles dp ON dp_entity.profile_id = dp.id
WHERE oi.item_status IN ('confirmed', 'processing', 'packed', 'picked_up', 'shipped', 'delivered');

-- Active Delivery Assignments for Delivery Partners
CREATE OR REPLACE VIEW public.active_delivery_assignments AS
SELECT 
  dpo.*,
  o.order_number,
  o.customer_id,
  o.delivery_address,
  o.total_amount,
  
  -- Customer info
  cp.full_name as customer_name,
  cp.phone as customer_phone,
  
  -- Vendor info for pickup
  v.business_name as vendor_name,
  v.business_address as pickup_address,
  vp.full_name as vendor_contact_name,
  vp.phone as vendor_contact_phone,
  
  -- Order items for this delivery
  json_agg(
    json_build_object(
      'product_name', oi.product_name,
      'quantity', oi.quantity,
      'line_total', oi.line_total
    )
  ) as order_items

FROM public.delivery_partner_orders dpo
JOIN public.orders o ON dpo.order_id = o.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles cp ON c.profile_id = cp.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.profiles vp ON v.profile_id = vp.id
WHERE dpo.status IN ('assigned', 'accepted', 'picked_up', 'out_for_delivery')
GROUP BY dpo.id, o.id, o.order_number, o.customer_id, o.delivery_address, o.total_amount,
         cp.full_name, cp.phone, v.business_name, v.business_address, vp.full_name, vp.phone;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partner_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Customers policies
CREATE POLICY "Customers can view their own data" ON public.customers
  FOR ALL USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Vendors policies  
CREATE POLICY "Vendors can view their own data" ON public.vendors
  FOR ALL USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Delivery partners policies
CREATE POLICY "Delivery partners can view their own data" ON public.delivery_partners
  FOR ALL USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Orders policies
CREATE POLICY "Customers can view their orders" ON public.orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Customers can create orders" ON public.orders
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Order items policies
CREATE POLICY "Vendors can view their order items" ON public.order_items
  FOR ALL USING (
    vendor_id IN (
      SELECT id FROM public.vendors 
      WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Customers can view order items for their orders" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id IN (
        SELECT id FROM public.customers 
        WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

-- Delivery partner orders policies
CREATE POLICY "Delivery partners can view their assignments" ON public.delivery_partner_orders
  FOR ALL USING (
    delivery_partner_id IN (
      SELECT id FROM public.delivery_partners 
      WHERE profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User and profile indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Business entity indexes
CREATE INDEX idx_customers_profile_id ON public.customers(profile_id);
CREATE INDEX idx_vendors_profile_id ON public.vendors(profile_id);
CREATE INDEX idx_delivery_partners_profile_id ON public.delivery_partners(profile_id);

-- Product catalog indexes
CREATE INDEX idx_vendor_products_vendor_id ON public.vendor_products(vendor_id);
CREATE INDEX idx_vendor_products_model_id ON public.vendor_products(model_id);
CREATE INDEX idx_vendor_products_category_id ON public.vendor_products(category_id);
CREATE INDEX idx_vendor_generic_products_vendor_id ON public.vendor_generic_products(vendor_id);

-- Order management indexes
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(order_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_vendor_id ON public.order_items(vendor_id);
CREATE INDEX idx_order_items_status ON public.order_items(item_status);

-- Delivery system indexes
CREATE INDEX idx_delivery_partner_orders_order_id ON public.delivery_partner_orders(order_id);
CREATE INDEX idx_delivery_partner_orders_partner_id ON public.delivery_partner_orders(delivery_partner_id);
CREATE INDEX idx_delivery_partner_orders_status ON public.delivery_partner_orders(status);
CREATE INDEX idx_delivery_partner_orders_pickup_otp ON public.delivery_partner_orders(pickup_otp);
CREATE INDEX idx_delivery_partner_orders_delivery_otp ON public.delivery_partner_orders(delivery_otp);

-- Location-based indexes
CREATE INDEX idx_delivery_partners_location ON public.delivery_partners(current_latitude, current_longitude);
CREATE INDEX idx_delivery_tracking_partner_order ON public.delivery_tracking(delivery_partner_order_id);

-- Status history indexes
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history(created_at);

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default categories
INSERT INTO public.categories (name, description, icon, gradient, sort_order) VALUES
('Displays', 'Phone screens and display assemblies', '📱', 'from-blue-500 to-blue-600', 1),
('Batteries', 'Original and compatible batteries', '🔋', 'from-green-500 to-green-600', 2),
('Cameras', 'Front and rear camera modules', '📷', 'from-purple-500 to-purple-600', 3),
('Charging Ports', 'USB-C, Lightning, and micro USB ports', '⚡', 'from-yellow-500 to-yellow-600', 4),
('Speakers', 'Earpiece and loudspeaker components', '🔊', 'from-red-500 to-red-600', 5),
('Frames', 'Phone frames and housing', '🔲', 'from-gray-500 to-gray-600', 6);

-- Insert quality categories for each category
INSERT INTO public.quality_categories (category_id, name, description, sort_order, color_code)
SELECT 
  c.id,
  quality_name,
  quality_desc,
  sort_order,
  color_code
FROM public.categories c
CROSS JOIN (VALUES
  ('Brand New', 'Original manufacturer parts', 1, '#10B981'),
  ('OEM Quality', 'High-quality compatible parts', 2, '#3B82F6'),
  ('Refurbished', 'Restored to working condition', 3, '#F59E0B'),
  ('Compatible', 'Third-party compatible parts', 4, '#6B7280')
) AS qualities(quality_name, quality_desc, sort_order, color_code);

-- Insert popular brands
INSERT INTO public.brands (name) VALUES
('Apple'), ('Samsung'), ('OnePlus'), ('Xiaomi'), ('Realme'), 
('Vivo'), ('Oppo'), ('Google'), ('Nothing'), ('Motorola');

-- Create some sample smartphone models
INSERT INTO public.smartphone_models (brand_id, model_name, model_number, release_year, base_price)
SELECT 
  b.id,
  b.name || ' ' || model_name,
  model_number,
  release_year,
  base_price
FROM public.brands b
CROSS JOIN (VALUES
  ('iPhone 15', 'A3089', 2023, 79900),
  ('iPhone 14', 'A2882', 2022, 69900),
  ('Galaxy S24', 'SM-S921', 2024, 74999),
  ('OnePlus 12', 'CPH2573', 2024, 64999)
) AS models(model_name, model_number, release_year, base_price)
WHERE b.name IN ('Apple', 'Samsung', 'OnePlus');

-- ============================================================================
-- FUNCTIONS FOR APPLICATION LOGIC
-- ============================================================================

-- Function to assign delivery partner to order
CREATE OR REPLACE FUNCTION assign_delivery_partner(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_delivery_instructions text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  pickup_otp_val varchar(6);
  delivery_otp_val varchar(6);
BEGIN
  -- Generate OTPs
  pickup_otp_val := generate_otp();
  delivery_otp_val := generate_otp();
  
  -- Create delivery assignment
  INSERT INTO public.delivery_partner_orders (
    order_id,
    delivery_partner_id,
    pickup_otp,
    delivery_otp,
    delivery_instructions,
    status
  ) VALUES (
    p_order_id,
    p_delivery_partner_id,
    pickup_otp_val,
    delivery_otp_val,
    p_delivery_instructions,
    'assigned'
  );
  
  -- Update order status
  UPDATE public.orders 
  SET order_status = 'confirmed',
      updated_at = now()
  WHERE id = p_order_id;
  
  -- Return success with OTPs
  result := jsonb_build_object(
    'success', true,
    'pickup_otp', pickup_otp_val,
    'delivery_otp', delivery_otp_val,
    'message', 'Delivery partner assigned successfully'
  );
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify OTP and update status
CREATE OR REPLACE FUNCTION verify_delivery_otp(
  p_order_id uuid,
  p_otp varchar(6),
  p_otp_type varchar(10), -- 'pickup' or 'delivery'
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  delivery_record record;
  result jsonb;
BEGIN
  -- Get delivery record
  SELECT * INTO delivery_record
  FROM public.delivery_partner_orders
  WHERE order_id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery assignment not found');
  END IF;
  
  -- Verify OTP based on type
  IF p_otp_type = 'pickup' THEN
    IF delivery_record.pickup_otp != p_otp THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid pickup OTP');
    END IF;
    
    -- Update pickup status
    UPDATE public.delivery_partner_orders
    SET pickup_otp_verified = true,
        pickup_otp_verified_at = now(),
        picked_up_at = now(),
        status = 'picked_up',
        updated_at = now()
    WHERE order_id = p_order_id;
    
    -- Update order items status
    UPDATE public.order_items
    SET item_status = 'picked_up',
        picked_up_at = now(),
        updated_at = now()
    WHERE order_id = p_order_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Pickup OTP verified successfully',
      'next_status', 'picked_up'
    );
    
  ELSIF p_otp_type = 'delivery' THEN
    IF delivery_record.delivery_otp != p_otp THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid delivery OTP');
    END IF;
    
    -- Update delivery status
    UPDATE public.delivery_partner_orders
    SET delivery_otp_verified = true,
        delivery_otp_verified_at = now(),
        delivered_at = now(),
        status = 'delivered',
        updated_at = now()
    WHERE order_id = p_order_id;
    
    -- Update order and order items status
    UPDATE public.orders
    SET order_status = 'delivered',
        actual_delivery_date = now(),
        updated_at = now()
    WHERE id = p_order_id;
    
    UPDATE public.order_items
    SET item_status = 'delivered',
        updated_at = now()
    WHERE order_id = p_order_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Delivery OTP verified successfully - Order completed!',
      'next_status', 'delivered'
    );
    
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid OTP type');
  END IF;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually assign orders to delivery partners
CREATE OR REPLACE FUNCTION assign_order_to_delivery_partner(
  p_order_id UUID,
  p_delivery_partner_id UUID
) RETURNS JSON AS $$
DECLARE
  v_pickup_otp TEXT;
  v_delivery_otp TEXT;
  v_result JSON;
BEGIN
  -- Generate random OTPs
  v_pickup_otp := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  v_delivery_otp := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Insert assignment
  INSERT INTO delivery_partner_orders (
    order_id,
    delivery_partner_id,
    status,
    pickup_otp,
    delivery_otp,
    assigned_at
  ) VALUES (
    p_order_id,
    p_delivery_partner_id,
    'assigned',
    v_pickup_otp,
    v_delivery_otp,
    NOW()
  );
  
  -- Return success result
  v_result := json_build_object(
    'success', true,
    'message', 'Order assigned successfully',
    'order_id', p_order_id,
    'delivery_partner_id', p_delivery_partner_id,
    'pickup_otp', v_pickup_otp,
    'delivery_otp', v_delivery_otp
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error result
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADDITIONAL VIEWS AND FUNCTIONS FOR DELIVERY API
-- ============================================================================

-- View for available delivery orders
CREATE OR REPLACE VIEW public.delivery_available_orders_view AS
SELECT 
  o.id as order_id,
  o.order_number,
  o.customer_id,
  cp.full_name as customer_name,
  cp.phone as customer_phone,
  oi.vendor_id,
  v.business_name as vendor_name,
  vp.phone as vendor_phone,
  v.business_address as vendor_address,
  o.delivery_address,
  o.total_amount,
  COUNT(oi.id) as item_count,
  o.created_at,
  'available_for_pickup' as status,
  -- Extract pincode for distance calculation
  COALESCE(
    o.delivery_address->>'pincode',
    o.delivery_address->>'postal_code',
    o.delivery_address->>'zip_code'
  ) as customer_pincode
FROM public.orders o
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles cp ON c.profile_id = cp.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.profiles vp ON v.profile_id = vp.id
WHERE o.order_status = 'confirmed'
  AND oi.item_status = 'confirmed'
  AND o.id NOT IN (SELECT order_id FROM public.delivery_partner_orders)
GROUP BY o.id, o.order_number, o.customer_id, cp.full_name, cp.phone, 
         oi.vendor_id, v.business_name, vp.phone, v.business_address, 
         o.delivery_address, o.total_amount, o.created_at;

-- View for delivery partner's assigned orders
CREATE OR REPLACE VIEW public.delivery_partner_orders_view AS
SELECT 
  dpo.id,
  dpo.order_id,
  o.order_number,
  o.customer_id,
  cp.full_name as customer_name,
  cp.phone as customer_phone,
  oi.vendor_id,
  v.business_name as vendor_name,
  vp.phone as vendor_phone,
  v.business_address as vendor_address,
  o.delivery_address,
  o.total_amount,
  COUNT(oi.id) as item_count,
  dpo.delivery_partner_id,
  dpo.status,
  dpo.pickup_otp,
  dpo.delivery_otp,
  dpo.accepted_at,
  dpo.picked_up_at,
  dpo.delivered_at,
  dpo.created_at
FROM public.delivery_partner_orders dpo
JOIN public.orders o ON dpo.order_id = o.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles cp ON c.profile_id = cp.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.vendors v ON oi.vendor_id = v.id
JOIN public.profiles vp ON v.profile_id = vp.id
GROUP BY dpo.id, dpo.order_id, o.order_number, o.customer_id, cp.full_name, cp.phone,
         oi.vendor_id, v.business_name, vp.phone, v.business_address, o.delivery_address,
         o.total_amount, dpo.delivery_partner_id, dpo.status, dpo.pickup_otp, dpo.delivery_otp,
         dpo.accepted_at, dpo.picked_up_at, dpo.delivered_at, dpo.created_at;

-- View for order details
CREATE OR REPLACE VIEW public.delivery_order_details_view AS
SELECT 
  o.*,
  c.id as customer_id,
  cp.full_name as customer_name,
  cp.phone as customer_phone,
  cp.email as customer_email,
  dpo.delivery_partner_id,
  dpo.status as delivery_status,
  dpo.pickup_otp,
  dpo.delivery_otp,
  dpo.accepted_at,
  dpo.picked_up_at,
  dpo.delivered_at,
  dp_profile.full_name as delivery_partner_name,
  dp_profile.phone as delivery_partner_phone,
  
  -- Order items summary
  json_agg(
    json_build_object(
      'id', oi.id,
      'product_name', oi.product_name,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'line_total', oi.line_total,
      'vendor_name', v.business_name
    )
  ) as order_items
  
FROM public.orders o
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles cp ON c.profile_id = cp.id
LEFT JOIN public.delivery_partner_orders dpo ON o.id = dpo.order_id
LEFT JOIN public.delivery_partners dp ON dpo.delivery_partner_id = dp.id
LEFT JOIN public.profiles dp_profile ON dp.profile_id = dp_profile.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.vendors v ON oi.vendor_id = v.id
GROUP BY o.id, c.id, cp.full_name, cp.phone, cp.email, dpo.delivery_partner_id,
         dpo.status, dpo.pickup_otp, dpo.delivery_otp, dpo.accepted_at, 
         dpo.picked_up_at, dpo.delivered_at, dp_profile.full_name, dp_profile.phone;

-- View for delivery history
CREATE OR REPLACE VIEW public.delivery_history_view AS
SELECT 
  dpo.*,
  o.order_number,
  o.total_amount,
  cp.full_name as customer_name,
  v.business_name as vendor_name,
  EXTRACT(EPOCH FROM (dpo.delivered_at - dpo.accepted_at)) / 60 as total_time_minutes
FROM public.delivery_partner_orders dpo
JOIN public.orders o ON dpo.order_id = o.id
JOIN public.customers c ON o.customer_id = c.id
JOIN public.profiles cp ON c.profile_id = cp.id
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.vendors v ON oi.vendor_id = v.id
WHERE dpo.status = 'delivered';

-- ============================================================================
-- DATABASE FUNCTIONS FOR DELIVERY WORKFLOW
-- ============================================================================

-- Function to accept delivery order
CREATE OR REPLACE FUNCTION public.accept_delivery_order(
  p_order_id uuid,
  p_delivery_partner_id uuid
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  existing_assignment record;
BEGIN
  -- Check if order is already assigned
  SELECT * INTO existing_assignment
  FROM public.delivery_partner_orders
  WHERE order_id = p_order_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order is already assigned to a delivery partner'
    );
  END IF;
  
  -- Create delivery assignment
  INSERT INTO public.delivery_partner_orders (
    order_id,
    delivery_partner_id,
    status,
    accepted_at
  ) VALUES (
    p_order_id,
    p_delivery_partner_id,
    'accepted',
    now()
  );
  
  -- Update order status
  UPDATE public.orders 
  SET order_status = 'confirmed',
      updated_at = now()
  WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order accepted successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark order as picked up
CREATE OR REPLACE FUNCTION public.mark_order_picked_up(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_pickup_otp varchar(6)
)
RETURNS jsonb AS $$
DECLARE
  delivery_record record;
  result jsonb;
BEGIN
  -- Get and verify delivery assignment
  SELECT * INTO delivery_record
  FROM public.delivery_partner_orders
  WHERE order_id = p_order_id 
    AND delivery_partner_id = p_delivery_partner_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery assignment not found');
  END IF;
  
  -- Verify pickup OTP
  IF delivery_record.pickup_otp != p_pickup_otp THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid pickup OTP');
  END IF;
  
  -- Update delivery assignment
  UPDATE public.delivery_partner_orders
  SET status = 'picked_up',
      pickup_otp_verified = true,
      pickup_otp_verified_at = now(),
      picked_up_at = now(),
      updated_at = now()
  WHERE order_id = p_order_id;
  
  -- Update order items
  UPDATE public.order_items
  SET item_status = 'picked_up',
      picked_up_at = now(),
      updated_at = now()
  WHERE order_id = p_order_id;
  
  -- Update main order
  UPDATE public.orders
  SET order_status = 'picked_up',
      updated_at = now()
  WHERE id = p_order_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order marked as picked up successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark order as delivered
CREATE OR REPLACE FUNCTION public.mark_order_delivered(
  p_order_id uuid,
  p_delivery_partner_id uuid,
  p_delivery_otp varchar(6)
)
RETURNS jsonb AS $$
DECLARE
  delivery_record record;
  result jsonb;
BEGIN
  -- Get and verify delivery assignment
  SELECT * INTO delivery_record
  FROM public.delivery_partner_orders
  WHERE order_id = p_order_id 
    AND delivery_partner_id = p_delivery_partner_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery assignment not found');
  END IF;
  
  -- Verify delivery OTP
  IF delivery_record.delivery_otp != p_delivery_otp THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid delivery OTP');
  END IF;
  
  -- Update delivery assignment
  UPDATE public.delivery_partner_orders
  SET status = 'delivered',
      delivery_otp_verified = true,
      delivery_otp_verified_at = now(),
      delivered_at = now(),
      actual_delivery_time_minutes = EXTRACT(EPOCH FROM (now() - accepted_at)) / 60,
      updated_at = now()
  WHERE order_id = p_order_id;
  
  -- Update order items
  UPDATE public.order_items
  SET item_status = 'delivered',
      updated_at = now()
  WHERE order_id = p_order_id;
  
  -- Update main order
  UPDATE public.orders
  SET order_status = 'delivered',
      actual_delivery_date = now(),
      updated_at = now()
  WHERE id = p_order_id;
  
  -- Update delivery partner stats
  UPDATE public.delivery_partners
  SET total_deliveries = total_deliveries + 1,
      successful_deliveries = successful_deliveries + 1,
      updated_at = now()
  WHERE id = p_delivery_partner_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order delivered successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update delivery partner location
CREATE OR REPLACE FUNCTION public.update_delivery_partner_location(
  p_delivery_partner_id uuid,
  p_latitude numeric,
  p_longitude numeric
)
RETURNS jsonb AS $$
BEGIN
  -- Update delivery partner location
  UPDATE public.delivery_partners
  SET current_latitude = p_latitude,
      current_longitude = p_longitude,
      last_location_update = now(),
      updated_at = now()
  WHERE id = p_delivery_partner_id;
  
  -- Insert tracking record for active deliveries
  INSERT INTO public.delivery_tracking (
    delivery_partner_order_id,
    delivery_partner_id,
    latitude,
    longitude,
    tracking_status
  )
  SELECT 
    dpo.id,
    p_delivery_partner_id,
    p_latitude,
    p_longitude,
    dpo.status
  FROM public.delivery_partner_orders dpo
  WHERE dpo.delivery_partner_id = p_delivery_partner_id
    AND dpo.status IN ('accepted', 'picked_up');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Location updated successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate new OTP
CREATE OR REPLACE FUNCTION public.generate_delivery_otp(
  p_order_id uuid,
  p_otp_type varchar(10)
)
RETURNS varchar(6) AS $$
DECLARE
  new_otp varchar(6);
BEGIN
  new_otp := generate_otp();
  
  IF p_otp_type = 'pickup' THEN
    UPDATE public.delivery_partner_orders
    SET pickup_otp = new_otp,
        pickup_otp_verified = false,
        updated_at = now()
    WHERE order_id = p_order_id;
  ELSIF p_otp_type = 'delivery' THEN
    UPDATE public.delivery_partner_orders
    SET delivery_otp = new_otp,
        delivery_otp_verified = false,
        updated_at = now()
    WHERE order_id = p_order_id;
  ELSE
    RAISE EXCEPTION 'Invalid OTP type: %', p_otp_type;
  END IF;
  
  RETURN new_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate delivery partner earnings
CREATE OR REPLACE FUNCTION public.calculate_delivery_earnings(
  p_delivery_partner_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb AS $$
DECLARE
  total_earnings numeric := 0;
  total_deliveries integer := 0;
  result jsonb;
BEGIN
  SELECT 
    COALESCE(SUM(delivery_fee), 0),
    COUNT(*)
  INTO total_earnings, total_deliveries
  FROM public.delivery_partner_orders
  WHERE delivery_partner_id = p_delivery_partner_id
    AND status = 'delivered'
    AND delivered_at::date BETWEEN p_start_date AND p_end_date;
  
  result := jsonb_build_object(
    'total_earnings', total_earnings,
    'total_deliveries', total_deliveries,
    'average_per_delivery', CASE WHEN total_deliveries > 0 THEN total_earnings / total_deliveries ELSE 0 END,
    'period_start', p_start_date,
    'period_end', p_end_date
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearby delivery partners
CREATE OR REPLACE FUNCTION public.get_nearby_delivery_partners(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_km numeric DEFAULT 10,
  p_pincode varchar(10) DEFAULT NULL
)
RETURNS TABLE(
  delivery_partner_id uuid,
  profile_id uuid,
  full_name text,
  phone varchar(15),
  distance_km numeric,
  rating numeric,
  total_deliveries integer,
  is_available boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id,
    dp.profile_id,
    p.full_name,
    p.phone,
    CASE 
      WHEN dp.current_latitude IS NOT NULL AND dp.current_longitude IS NOT NULL THEN
        -- Calculate distance using Haversine formula (approximation)
        (6371 * acos(cos(radians(p_latitude)) * cos(radians(dp.current_latitude)) * 
        cos(radians(dp.current_longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * sin(radians(dp.current_latitude))))
      ELSE 999999 -- Large number for unknown locations
    END as distance_km,
    dp.rating,
    dp.total_deliveries,
    dp.is_available
  FROM public.delivery_partners dp
  JOIN public.profiles p ON dp.profile_id = p.id
  WHERE dp.is_active = true
    AND dp.is_verified = true
    AND (p_pincode IS NULL OR p_pincode = ANY(dp.assigned_pincodes))
    AND (dp.current_latitude IS NULL OR dp.current_longitude IS NULL OR
         (6371 * acos(cos(radians(p_latitude)) * cos(radians(dp.current_latitude)) * 
          cos(radians(dp.current_longitude) - radians(p_longitude)) + 
          sin(radians(p_latitude)) * sin(radians(dp.current_latitude)))) <= p_radius_km)
  ORDER BY distance_km, dp.rating DESC, dp.total_deliveries DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DELIVERY PARTNER STATS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_partner_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_partner_id uuid NOT NULL REFERENCES public.delivery_partners(id) UNIQUE,
  today_deliveries integer DEFAULT 0,
  week_deliveries integer DEFAULT 0,
  month_deliveries integer DEFAULT 0,
  total_deliveries integer DEFAULT 0,
  today_earnings numeric(10,2) DEFAULT 0,
  week_earnings numeric(10,2) DEFAULT 0,
  month_earnings numeric(10,2) DEFAULT 0,
  total_earnings numeric(10,2) DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0.00,
  active_orders integer DEFAULT 0,
  last_delivery_at timestamp with time zone,
  stats_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- This schema now fully supports the app flow:
-- 🛍️ Order Placed → 📦 Order Confirmed by Vendor → 🚚 Delivery Partner Assigned → 
-- 🔑 OTP Generated → 📱 Customer Gets Delivery OTP → 📱 Delivery Partner Gets Pickup OTP → 
-- 📍 Delivery Partner Goes to Vendor → 🔐 Pickup OTP Verified with Vendor → 
-- 📦 Order Picked Up → 🚗 Delivery Partner Goes to Customer → 🏠 Delivery Partner Arrives → 
-- 🤝 Customer Shares Delivery OTP → 🔐 Delivery Partner Enters OTP → ✅ Order Marked as Delivered
-- ============================================================================