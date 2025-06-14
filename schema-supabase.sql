-- This is the schema for the Supabase database. which is deployed on supabase.com for project of Tryodo Website
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.brands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brands_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  icon character varying,
  gradient character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.category_qualities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  quality_name character varying NOT NULL,
  quality_description text,
  specifications jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT category_qualities_pkey PRIMARY KEY (id),
  CONSTRAINT category_qualities_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.customer_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  address_type character varying NOT NULL DEFAULT 'home'::character varying,
  address_line1 character varying NOT NULL,
  address_line2 character varying,
  city character varying NOT NULL,
  state character varying NOT NULL,
  pincode character varying NOT NULL,
  landmark character varying,
  contact_name character varying,
  contact_phone character varying,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.customer_wishlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  smartphone_model_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_wishlists_pkey PRIMARY KEY (id),
  CONSTRAINT customer_wishlists_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT customer_wishlists_smartphone_model_id_fkey FOREIGN KEY (smartphone_model_id) REFERENCES public.smartphone_models(id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  date_of_birth date,
  gender character varying CHECK (gender::text = ANY (ARRAY['male'::character varying, 'female'::character varying, 'other'::character varying]::text[])),
  preferred_brands ARRAY,
  budget_range_min numeric,
  budget_range_max numeric,
  total_orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  last_order_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.generic_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  specifications jsonb,
  official_images ARRAY,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT generic_products_pkey PRIMARY KEY (id),
  CONSTRAINT generic_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.listing_price_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_product_id uuid,
  vendor_generic_product_id uuid,
  old_price numeric,
  new_price numeric,
  change_reason character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT listing_price_history_pkey PRIMARY KEY (id),
  CONSTRAINT listing_price_history_vendor_generic_product_id_fkey FOREIGN KEY (vendor_generic_product_id) REFERENCES public.vendor_generic_products(id),
  CONSTRAINT listing_price_history_vendor_product_id_fkey FOREIGN KEY (vendor_product_id) REFERENCES public.vendor_products(id)
);
CREATE TABLE public.model_category_qualities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  smartphone_model_id uuid NOT NULL,
  category_id uuid NOT NULL,
  category_quality_id uuid NOT NULL,
  additional_specs jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT model_category_qualities_pkey PRIMARY KEY (id),
  CONSTRAINT model_category_qualities_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT model_category_qualities_smartphone_model_id_fkey FOREIGN KEY (smartphone_model_id) REFERENCES public.smartphone_models(id),
  CONSTRAINT model_category_qualities_category_quality_id_fkey FOREIGN KEY (category_quality_id) REFERENCES public.category_qualities(id)
);
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  vendor_product_id uuid,
  vendor_generic_product_id uuid,
  product_name character varying NOT NULL,
  product_description text,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  line_total numeric DEFAULT (unit_price * (quantity)::numeric),
  item_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (item_status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'packed'::character varying, 'picked_up'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'returned'::character varying, 'refunded'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  picked_up_at timestamp with time zone,
  pickup_confirmed_by character varying,
  vendor_notes text,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_vendor_generic_product_id_fkey FOREIGN KEY (vendor_generic_product_id) REFERENCES public.vendor_generic_products(id),
  CONSTRAINT order_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_vendor_product_id_fkey FOREIGN KEY (vendor_product_id) REFERENCES public.vendor_products(id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number character varying NOT NULL DEFAULT (('ORD'::text || to_char(now(), 'YYYYMMDD'::text)) || lpad((nextval('order_sequence'::regclass))::text, 6, '0'::text)) UNIQUE,
  customer_id uuid NOT NULL,
  delivery_address jsonb NOT NULL,
  subtotal numeric NOT NULL,
  shipping_charges numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  order_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (order_status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'processing'::character varying, 'packed'::character varying, 'picked_up'::character varying, 'shipped'::character varying, 'out_for_delivery'::character varying, 'delivered'::character varying, 'cancelled'::character varying, 'returned'::character varying, 'refunded'::character varying]::text[])),
  payment_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (payment_status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying, 'partially_refunded'::character varying]::text[])),
  payment_method character varying,
  payment_id character varying,
  estimated_delivery_date date,
  actual_delivery_date timestamp with time zone,
  shipped_date timestamp with time zone,
  cancelled_date timestamp with time zone,
  cancellation_reason text,
  special_instructions text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  picked_up_date timestamp with time zone,
  out_for_delivery_date timestamp with time zone,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['customer'::text, 'vendor'::text, 'admin'::text])),
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  phone character varying,
  address text,
  city character varying,
  state character varying,
  pincode character varying,
  is_active boolean DEFAULT true,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.quality_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  color_code character varying DEFAULT '#6B7280'::character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quality_categories_pkey PRIMARY KEY (id),
  CONSTRAINT quality_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.smartphone_comparisons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  smartphone_model_ids ARRAY NOT NULL,
  comparison_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smartphone_comparisons_pkey PRIMARY KEY (id),
  CONSTRAINT smartphone_comparisons_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.smartphone_models (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL,
  model_name character varying NOT NULL,
  model_number character varying,
  release_year integer,
  base_price numeric,
  specifications jsonb,
  official_images ARRAY,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smartphone_models_pkey PRIMARY KEY (id),
  CONSTRAINT smartphone_models_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.smartphone_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  smartphone_model_id uuid NOT NULL,
  customer_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smartphone_views_pkey PRIMARY KEY (id),
  CONSTRAINT smartphone_views_smartphone_model_id_fkey FOREIGN KEY (smartphone_model_id) REFERENCES public.smartphone_models(id),
  CONSTRAINT smartphone_views_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.vendor_generic_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  generic_product_id uuid NOT NULL,
  quality_type_id uuid NOT NULL,
  price numeric NOT NULL CHECK (price > 0::numeric),
  original_price numeric,
  discount_percentage integer DEFAULT 
CASE
    WHEN ((original_price > (0)::numeric) AND (price < original_price)) THEN (round((((original_price - price) / original_price) * (100)::numeric), 0))::integer
    ELSE 0
END,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_in_stock boolean DEFAULT (stock_quantity > 0),
  warranty_months integer DEFAULT 0,
  delivery_time_days integer DEFAULT 3,
  product_images ARRAY,
  specifications jsonb,
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_generic_products_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_generic_products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
  CONSTRAINT vendor_generic_products_generic_product_id_fkey FOREIGN KEY (generic_product_id) REFERENCES public.generic_products(id),
  CONSTRAINT vendor_generic_products_quality_type_id_fkey FOREIGN KEY (quality_type_id) REFERENCES public.quality_categories(id)
);
CREATE TABLE public.vendor_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  model_id uuid NOT NULL,
  category_id uuid NOT NULL,
  quality_type_id uuid NOT NULL,
  price numeric NOT NULL CHECK (price > 0::numeric),
  original_price numeric,
  discount_percentage integer DEFAULT 
CASE
    WHEN ((original_price > (0)::numeric) AND (price < original_price)) THEN (round((((original_price - price) / original_price) * (100)::numeric), 0))::integer
    ELSE 0
END,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_in_stock boolean DEFAULT (stock_quantity > 0),
  warranty_months integer DEFAULT 0,
  delivery_time_days integer DEFAULT 3,
  product_images ARRAY,
  specifications jsonb,
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_products_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT vendor_products_quality_type_id_fkey FOREIGN KEY (quality_type_id) REFERENCES public.quality_categories(id),
  CONSTRAINT vendor_products_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.smartphone_models(id),
  CONSTRAINT vendor_products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);
CREATE TABLE public.vendor_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  order_id uuid NOT NULL,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  product_quality_rating integer CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
  shipping_rating integer CHECK (shipping_rating >= 1 AND shipping_rating <= 5),
  communication_rating integer CHECK (communication_rating >= 1 AND communication_rating <= 5),
  review_title character varying,
  review_text text,
  review_images ARRAY,
  helpful_votes integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_hidden boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT vendor_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT vendor_reviews_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);
CREATE TABLE public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE,
  business_name character varying NOT NULL,
  business_registration character varying,
  gstin character varying,
  business_address text,
  business_city character varying,
  business_state character varying,
  business_pincode character varying,
  contact_person character varying,
  contact_phone character varying,
  business_email character varying,
  website_url character varying,
  rating numeric DEFAULT 0.00 CHECK (rating >= 0::numeric AND rating <= 5::numeric),
  total_reviews integer DEFAULT 0,
  total_sales integer DEFAULT 0,
  response_time_hours integer DEFAULT 24,
  shipping_policy text,
  return_policy text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  auto_approve_orders boolean DEFAULT false,
  order_confirmation_timeout_minutes integer DEFAULT 15,
  auto_approve_under_amount numeric DEFAULT NULL::numeric,
  business_hours_start time without time zone DEFAULT '09:00:00'::time without time zone,
  business_hours_end time without time zone DEFAULT '18:00:00'::time without time zone,
  auto_approve_during_business_hours_only boolean DEFAULT true,
  CONSTRAINT vendors_pkey PRIMARY KEY (id)
);