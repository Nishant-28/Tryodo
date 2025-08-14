-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

create table public.brands (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(100) not null,
  logo_url text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint brands_pkey primary key (id),
  constraint brands_name_key unique (name)
) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on brands for EACH row
execute FUNCTION update_updated_at_column ();

create table public.cart_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  cart_id uuid not null,
  product_id uuid not null,
  quantity integer not null,
  added_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint cart_items_pkey primary key (id),
  constraint cart_items_cart_id_product_id_key unique (cart_id, product_id),
  constraint cart_items_cart_id_fkey foreign KEY (cart_id) references shopping_carts (id) on delete CASCADE,
  constraint cart_items_product_id_fkey foreign KEY (product_id) references vendor_products (id) on delete CASCADE,
  constraint cart_items_quantity_check check ((quantity > 0))
) TABLESPACE pg_default;

create index IF not exists idx_cart_items_cart_id on public.cart_items using btree (cart_id) TABLESPACE pg_default;

create index IF not exists idx_cart_items_product_id on public.cart_items using btree (product_id) TABLESPACE pg_default;

create trigger trigger_cart_items_updated_at BEFORE
update on cart_items for EACH row
execute FUNCTION update_updated_at_column ();

create table public.categories (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(100) not null,
  description text null,
  icon character varying(50) null,
  gradient character varying(100) null,
  sort_order integer null default 0,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint categories_pkey primary key (id),
  constraint categories_name_key unique (name)
) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on categories for EACH row
execute FUNCTION update_updated_at_column ();

create table public.categories (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(100) not null,
  description text null,
  icon character varying(50) null,
  gradient character varying(100) null,
  sort_order integer null default 0,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint categories_pkey primary key (id),
  constraint categories_name_key unique (name)
) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on categories for EACH row
execute FUNCTION update_updated_at_column ();

CREATE TABLE public.commission_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  quality_id uuid NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  total_sales numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  total_upside numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  average_commission_rate numeric DEFAULT 0,
  average_upside_rate numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT commission_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT commission_analytics_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
  CONSTRAINT commission_analytics_quality_id_fkey FOREIGN KEY (quality_id) REFERENCES public.category_qualities(id)
);
create table public.commission_rules (
  id uuid not null default gen_random_uuid (),
  category_id uuid not null,
  commission_percentage numeric not null,
  minimum_commission numeric null default 0,
  maximum_commission numeric null,
  is_active boolean null default true,
  effective_from timestamp with time zone null default now(),
  effective_until timestamp with time zone null,
  created_by uuid null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  quality_id uuid null,
  smartphone_model_id uuid null,
  constraint commission_rules_pkey primary key (id),
  constraint commission_rules_category_id_fkey foreign KEY (category_id) references categories (id),
  constraint commission_rules_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint commission_rules_quality_id_fkey foreign KEY (quality_id) references category_qualities (id),
  constraint commission_rules_smartphone_model_id_fkey foreign KEY (smartphone_model_id) references smartphone_models (id),
  constraint commission_rules_commission_percentage_check check (
    (
      (commission_percentage >= (0)::numeric)
      and (commission_percentage <= (100)::numeric)
    )
  )
) TABLESPACE pg_default;

create table public.customer_addresses (
  id uuid not null default gen_random_uuid (),
  customer_id uuid not null,
  shop_name text not null,
  owner_name text not null,
  pincode character varying not null,
  address_box text not null,
  phone_number character varying not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint customer_addresses_pkey primary key (id),
  constraint customer_addresses_customer_id_fkey foreign KEY (customer_id) references customers (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.customers (
  id uuid not null default extensions.uuid_generate_v4 (),
  profile_id uuid not null,
  date_of_birth date null,
  gender character varying(10) null,
  total_orders integer null default 0,
  total_spent numeric(12, 2) null default 0,
  last_order_date timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint customers_pkey primary key (id),
  constraint customers_profile_id_key unique (profile_id),
  constraint customers_profile_id_fkey foreign KEY (profile_id) references profiles (id) on delete CASCADE,
  constraint customers_gender_check check (
    (
      (gender)::text = any (
        (
          array[
            'male'::character varying,
            'female'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on customers for EACH row
execute FUNCTION update_updated_at_column ();


create table public.delivery_assignments (
  id uuid not null default gen_random_uuid (),
  delivery_partner_id uuid not null,
  slot_id uuid null,
  assigned_date date not null,
  sector_id uuid null,
  max_orders integer null default 30,
  current_orders integer null default 0,
  status character varying(20) null default 'assigned'::character varying,
  created_at timestamp with time zone null default now(),
  constraint delivery_assignments_pkey primary key (id),
  constraint delivery_assignments_delivery_partner_id_assigned_date_slot_key unique (delivery_partner_id, assigned_date, slot_id),
  constraint delivery_assignments_sector_id_fkey foreign KEY (sector_id) references sectors (id) on delete CASCADE,
  constraint delivery_assignments_slot_id_fkey foreign KEY (slot_id) references delivery_slots (id) on delete CASCADE,
  constraint delivery_assignments_status_check check (
    (
      (status)::text = any (
        (
          array[
            'assigned'::character varying,
            'active'::character varying,
            'completed'::character varying,
            'cancelled'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_delivery_assignments_date_partner on public.delivery_assignments using btree (assigned_date, delivery_partner_id) TABLESPACE pg_default;

CREATE TABLE public.delivery_day_end_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_partner_id uuid NOT NULL,
  summary_date date NOT NULL,
  total_cash_collected numeric NOT NULL DEFAULT 0,
  total_digital_collected numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  summary_notes text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delivery_day_end_summaries_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_day_end_summaries_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);
CREATE TABLE public.delivery_earnings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  delivery_partner_order_id uuid NOT NULL,
  delivery_partner_id uuid NOT NULL,
  order_id uuid NOT NULL,
  base_delivery_fee numeric DEFAULT 0,
  distance_bonus numeric DEFAULT 0,
  time_bonus numeric DEFAULT 0,
  performance_bonus numeric DEFAULT 0,
  incentive_amount numeric DEFAULT 5.00,
  total_earning numeric NOT NULL,
  distance_km numeric,
  delivery_time_minutes integer,
  peak_time_multiplier numeric DEFAULT 1.0,
  earning_status character varying DEFAULT 'pending'::character varying CHECK (earning_status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'paid'::character varying, 'cancelled'::character varying]::text[])),
  calculated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_earnings_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT delivery_earnings_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id),
  CONSTRAINT delivery_earnings_delivery_partner_order_id_fkey FOREIGN KEY (delivery_partner_order_id) REFERENCES public.delivery_partner_orders(id)
);
CREATE TABLE public.delivery_partner_attendance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  delivery_partner_id uuid,
  check_in timestamp with time zone NOT NULL,
  check_out timestamp with time zone,
  total_orders integer DEFAULT 0,
  total_earnings numeric DEFAULT 0.0,
  total_distance numeric DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partner_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_attendance_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);
CREATE TABLE public.delivery_partner_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  delivery_partner_id uuid,
  document_type character varying NOT NULL,
  document_number character varying,
  document_url text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_by uuid,
  verification_date timestamp with time zone,
  expiry_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partner_documents_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id),
  CONSTRAINT delivery_partner_documents_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);
CREATE TABLE public.delivery_partner_earnings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  delivery_partner_id uuid,
  order_id uuid,
  amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  final_amount numeric NOT NULL,
  status character varying DEFAULT 'pending'::character varying,
  payment_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT delivery_partner_earnings_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT delivery_partner_earnings_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);
create table public.delivery_partner_orders (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid not null,
  delivery_partner_id uuid not null,
  status character varying(20) not null default 'assigned'::character varying,
  assigned_at timestamp with time zone null default now(),
  accepted_at timestamp with time zone null,
  picked_up_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  cancelled_at timestamp with time zone null,
  delivery_fee numeric(8, 2) null default 0,
  distance_km numeric(8, 2) null,
  actual_delivery_time_minutes integer null,
  pickup_instructions text null,
  delivery_instructions text null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  payment_collected boolean not null default false,
  payment_collected_at timestamp with time zone null,
  payment_collection_amount numeric(10, 2) null default 0,
  pickup_otp numeric null,
  delivery_otp numeric null,
  constraint delivery_partner_orders_pkey primary key (id),
  constraint delivery_partner_orders_order_id_key unique (order_id),
  constraint delivery_partner_orders_delivery_partner_id_fkey foreign KEY (delivery_partner_id) references delivery_partners (id),
  constraint delivery_partner_orders_order_id_fkey foreign KEY (order_id) references orders (id)
) TABLESPACE pg_default;

create index IF not exists delivery_partner_orders_status_idx on public.delivery_partner_orders using btree (status) TABLESPACE pg_default;

create trigger trigger_set_delivery_otps BEFORE INSERT on delivery_partner_orders for EACH row
execute FUNCTION set_delivery_otps ();

create trigger trigger_update_delivery_stats
after
update on delivery_partner_orders for EACH row
execute FUNCTION update_delivery_partner_stats ();

create trigger trigger_update_updated_at BEFORE
update on delivery_partner_orders for EACH row
execute FUNCTION update_updated_at_column ();

create table public.delivery_partner_sector_assignments (
  id uuid not null default gen_random_uuid (),
  delivery_partner_id uuid not null,
  sector_id uuid not null,
  slot_id uuid not null,
  assigned_date date not null default CURRENT_DATE,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint delivery_partner_sector_assignments_pkey primary key (id),
  constraint unique_partner_sector_slot_date unique (
    delivery_partner_id,
    sector_id,
    slot_id,
    assigned_date
  ),
  constraint delivery_partner_sector_assignments_delivery_partner_id_fkey foreign KEY (delivery_partner_id) references delivery_partners (id),
  constraint delivery_partner_sector_assignments_sector_id_fkey foreign KEY (sector_id) references sectors (id),
  constraint delivery_partner_sector_assignments_slot_id_fkey foreign KEY (slot_id) references delivery_slots (id)
) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_sector_assignments_partner_id on public.delivery_partner_sector_assignments using btree (delivery_partner_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_sector_assignments_sector_id on public.delivery_partner_sector_assignments using btree (sector_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_sector_assignments_slot_id on public.delivery_partner_sector_assignments using btree (slot_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_sector_assignments_date on public.delivery_partner_sector_assignments using btree (assigned_date) TABLESPACE pg_default;

create trigger update_delivery_partner_sector_assignments_updated_at BEFORE
update on delivery_partner_sector_assignments for EACH row
execute FUNCTION update_delivery_partner_sector_assignments_updated_at ();

CREATE TABLE public.delivery_partner_stats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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
CREATE TABLE public.delivery_partner_wallets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  delivery_partner_id uuid NOT NULL UNIQUE,
  pending_balance numeric DEFAULT 0,
  available_balance numeric DEFAULT 0,
  total_earned numeric DEFAULT 0,
  total_paid_out numeric DEFAULT 0,
  base_salary numeric DEFAULT 0,
  incentive_earnings numeric DEFAULT 0,
  bonus_earnings numeric DEFAULT 0,
  today_earnings numeric DEFAULT 0,
  week_earnings numeric DEFAULT 0,
  month_earnings numeric DEFAULT 0,
  today_deliveries integer DEFAULT 0,
  week_deliveries integer DEFAULT 0,
  month_deliveries integer DEFAULT 0,
  base_salary_amount numeric DEFAULT 15000,
  incentive_per_delivery numeric DEFAULT 5.00,
  minimum_payout_amount numeric DEFAULT 500,
  auto_payout_enabled boolean DEFAULT false,
  last_payout_date timestamp with time zone,
  last_delivery_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  total_collected numeric NOT NULL DEFAULT 0,
  cash_in_hand numeric NOT NULL DEFAULT 0,
  last_settlement_date date,
  CONSTRAINT delivery_partner_wallets_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_partner_wallets_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id)
);

create table public.delivery_partners (
  id uuid not null default extensions.uuid_generate_v4 (),
  profile_id uuid not null,
  license_number character varying(50) not null,
  vehicle_type character varying(20) not null,
  vehicle_number character varying(20) not null,
  aadhar_number character varying(12) not null,
  pan_number character varying(10) null,
  bank_account_number character varying(20) null,
  bank_ifsc_code character varying(11) null,
  emergency_contact_name character varying(200) null,
  emergency_contact_phone character varying(15) null,
  current_latitude numeric(10, 8) null,
  current_longitude numeric(11, 8) null,
  assigned_pincodes text[] null default '{}'::text[],
  is_available boolean null default true,
  is_active boolean null default true,
  is_verified boolean null default false,
  rating numeric(3, 2) null default 0.00,
  total_reviews integer null default 0,
  total_deliveries integer null default 0,
  successful_deliveries integer null default 0,
  cancelled_deliveries integer null default 0,
  average_delivery_time_minutes integer null default 0,
  joined_at timestamp with time zone null default now(),
  last_location_update timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint delivery_partners_pkey primary key (id),
  constraint delivery_partners_profile_id_key unique (profile_id),
  constraint delivery_partners_profile_id_fkey foreign KEY (profile_id) references profiles (id) on delete CASCADE,
  constraint delivery_partners_rating_check check (
    (
      (rating >= (0)::numeric)
      and (rating <= (5)::numeric)
    )
  ),
  constraint delivery_partners_vehicle_type_check check (
    (
      (vehicle_type)::text = any (
        (
          array[
            'bike'::character varying,
            'scooter'::character varying,
            'bicycle'::character varying,
            'car'::character varying,
            'auto'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on delivery_partners for EACH row
execute FUNCTION update_updated_at_column ();

create trigger update_delivery_partners_updated_at BEFORE
update on delivery_partners for EACH row
execute FUNCTION update_updated_at_column ();

CREATE TABLE public.delivery_payment_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_partner_id uuid NOT NULL,
  order_id uuid NOT NULL,
  amount_collected numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'upi'::text])),
  collection_notes text,
  collected_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delivery_payment_collections_pkey PRIMARY KEY (id),
  CONSTRAINT delivery_payment_collections_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id),
  CONSTRAINT delivery_payment_collections_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
create table public.delivery_slots (
  id uuid not null default gen_random_uuid (),
  sector_id uuid null,
  slot_name character varying(50) not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  cutoff_time time without time zone not null,
  pickup_delay_minutes integer null default 45,
  max_orders integer null default 50,
  is_active boolean null default true,
  day_of_week integer[] null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint delivery_slots_pkey primary key (id),
  constraint delivery_slots_sector_id_fkey foreign KEY (sector_id) references sectors (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_delivery_slots_sector on public.delivery_slots using btree (sector_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_slots_sector_active on public.delivery_slots using btree (sector_id, is_active) TABLESPACE pg_default;

create trigger update_delivery_slots_updated_at BEFORE
update on delivery_slots for EACH row
execute FUNCTION update_updated_at_column ();

CREATE TABLE public.generic_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  category_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  specifications jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT generic_products_pkey PRIMARY KEY (id),
  CONSTRAINT generic_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL UNIQUE,
  push_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT true,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
  quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
  order_status_notifications boolean DEFAULT true,
  delivery_status_notifications boolean DEFAULT true,
  payment_notifications boolean DEFAULT true,
  promotional_notifications boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notification_queue (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  recipient_id uuid NOT NULL,
  notification_type character varying NOT NULL,
  title character varying NOT NULL,
  body text NOT NULL,
  icon text,
  badge text,
  tag character varying,
  data jsonb,
  actions jsonb,
  require_interaction boolean DEFAULT false,
  silent boolean DEFAULT false,
  scheduled_at timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])),
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_queue_pkey PRIMARY KEY (id),
  CONSTRAINT notification_queue_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id)
);
create table public.order_cancellations (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid not null,
  delivery_partner_id uuid not null,
  cancellation_reason text not null,
  additional_details text null,
  cancelled_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint order_cancellations_pkey primary key (id),
  constraint order_cancellations_delivery_partner_id_fkey foreign KEY (delivery_partner_id) references delivery_partners (id) on delete CASCADE,
  constraint order_cancellations_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_order_cancellations_order_id on public.order_cancellations using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_order_cancellations_delivery_partner_id on public.order_cancellations using btree (delivery_partner_id) TABLESPACE pg_default;

create index IF not exists idx_order_cancellations_cancelled_at on public.order_cancellations using btree (cancelled_at) TABLESPACE pg_default;

create index IF not exists idx_order_cancellations_reason on public.order_cancellations using btree (cancellation_reason) TABLESPACE pg_default;

create index IF not exists idx_order_cancellations_partner_date on public.order_cancellations using btree (delivery_partner_id, cancelled_at) TABLESPACE pg_default;

create trigger update_order_cancellations_updated_at BEFORE
update on order_cancellations for EACH row
execute FUNCTION update_updated_at_column ();

create table public.order_deliveries (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  delivery_partner_id uuid not null,
  delivered_at timestamp with time zone not null default now(),
  delivery_notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  delivery_status character varying not null default 'delivered'::character varying,
  delivery_time timestamp with time zone null,
  constraint order_deliveries_pkey primary key (id),
  constraint order_deliveries_delivery_partner_id_fkey foreign KEY (delivery_partner_id) references delivery_partners (id) on delete set null,
  constraint order_deliveries_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;

CREcreate table public.order_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid not null,
  vendor_id uuid not null,
  product_name character varying(200) not null,
  product_description text null,
  category_name character varying(100) null,
  quality_type_name character varying(100) null,
  unit_price numeric(10, 2) not null,
  quantity integer not null default 1,
  line_total numeric(12, 2) not null,
  item_status character varying(30) not null default 'pending'::character varying,
  vendor_confirmed_at timestamp with time zone null,
  vendor_notes text null,
  picked_up_at timestamp with time zone null,
  pickup_confirmed_by character varying(200) null,
  warranty_months integer null default 0,
  estimated_delivery_days integer null default 3,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  smartphone_model_id uuid null,
  vendor_product_id uuid null,
  vendor_generic_product_id uuid null,
  constraint order_items_pkey primary key (id),
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_smartphone_model_id_fkey foreign KEY (smartphone_model_id) references smartphone_models (id),
  constraint order_items_vendor_id_fkey foreign KEY (vendor_id) references vendors (id)
) TABLESPACE pg_default;

create trigger trigger_auto_assign_delivery
after
update on order_items for EACH row
execute FUNCTION auto_assign_delivery_partner ();

create trigger trigger_populate_quality_type_name BEFORE INSERT
or
update on order_items for EACH row
execute FUNCTION populate_quality_type_name ();

create trigger trigger_update_updated_at BEFORE
update on order_items for EACH row
execute FUNCTION update_updated_at_column ();

create table public.order_pickups (
  id uuid not null default gen_random_uuid (),
  order_id uuid null,
  vendor_id uuid not null,
  delivery_partner_id uuid not null,
  pickup_status character varying(20) null default 'pending'::character varying,
  pickup_time timestamp with time zone null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint order_pickups_pkey primary key (id),
  constraint order_pickups_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_pickups_pickup_status_check check (
    (
      (pickup_status)::text = any (
        (
          array[
            'pending'::character varying,
            'en_route'::character varying,
            'picked_up'::character varying,
            'failed'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_order_pickups_order_vendor on public.order_pickups using btree (order_id, vendor_id) TABLESPACE pg_default;

create trigger update_order_pickups_updated_at BEFORE
update on order_pickups for EACH row
execute FUNCTION update_updated_at_column ();

create table public.orders (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_number character varying(50) not null,
  customer_id uuid not null,
  subtotal numeric(12, 2) not null,
  shipping_charges numeric(10, 2) null default 0,
  tax_amount numeric(10, 2) null default 0,
  discount_amount numeric(10, 2) null default 0,
  total_amount numeric(12, 2) not null,
  order_status character varying(30) not null default 'pending'::character varying,
  payment_status character varying(20) not null default 'pending'::character varying,
  payment_method character varying(50) null,
  payment_id character varying(100) null,
  estimated_delivery_date date null,
  actual_delivery_date timestamp with time zone null,
  delivery_instructions text null,
  preferred_delivery_time timestamp with time zone null,
  delivery_attempts integer null default 0,
  last_delivery_attempt timestamp with time zone null,
  special_instructions text null,
  notes text null,
  cancelled_date timestamp with time zone null,
  cancellation_reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  slot_id uuid null,
  sector_id uuid null,
  delivery_date date null,
  pickup_time timestamp with time zone null,
  out_for_delivery_time timestamp with time zone null,
  estimated_delivery_time timestamp with time zone null,
  delivery_address_id uuid null,
  picked_up_date timestamp without time zone null,
  cancellation_id uuid null,
  constraint orders_pkey primary key (id),
  constraint orders_order_number_key unique (order_number),
  constraint orders_delivery_address_id_fkey foreign KEY (delivery_address_id) references customer_addresses (id),
  constraint orders_cancellation_id_fkey foreign KEY (cancellation_id) references order_cancellations (id) on delete set null,
  constraint orders_customer_id_fkey foreign KEY (customer_id) references customers (id),
  constraint orders_sector_id_fkey foreign KEY (sector_id) references sectors (id),
  constraint orders_slot_id_fkey foreign KEY (slot_id) references delivery_slots (id),
  constraint orders_payment_status_check check (
    (
      (payment_status)::text = any (
        (
          array[
            'pending'::character varying,
            'processing'::character varying,
            'paid'::character varying,
            'failed'::character varying,
            'refunded'::character varying,
            'partially_refunded'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint orders_order_status_check check (
    (
      (order_status)::text = any (
        (
          array[
            'pending'::character varying,
            'confirmed'::character varying,
            'processing'::character varying,
            'packed'::character varying,
            'picked_up'::character varying,
            'out_for_delivery'::character varying,
            'delivered'::character varying,
            'cancelled'::character varying,
            'returned'::character varying,
            'refunded'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_orders_slot_delivery_date on public.orders using btree (slot_id, delivery_date) TABLESPACE pg_default;

create index IF not exists idx_orders_status_sector on public.orders using btree (order_status, sector_id) TABLESPACE pg_default;

create index IF not exists idx_orders_slot_date on public.orders using btree (slot_id, delivery_date) TABLESPACE pg_default;

create index IF not exists idx_orders_cancellation_id on public.orders using btree (cancellation_id) TABLESPACE pg_default;

create trigger on_order_delivered
after
update on orders for EACH row
execute FUNCTION trigger_process_order_completion ();

create trigger trigger_orders_sync_wallets
after INSERT
or DELETE
or
update on orders for EACH row
execute FUNCTION trigger_sync_wallet_on_order_update ();

create trigger trigger_process_order_completion_on_orders
after
update on orders for EACH row
execute FUNCTION trigger_process_order_completion ();

create trigger trigger_set_order_number BEFORE INSERT on orders for EACH row
execute FUNCTION set_order_number ();

create trigger trigger_update_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at_column ();

CREATE TABLE public.payouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  payout_number character varying NOT NULL UNIQUE,
  recipient_type character varying NOT NULL CHECK (recipient_type::text = ANY (ARRAY['vendor'::character varying, 'delivery_partner'::character varying]::text[])),
  recipient_id uuid NOT NULL,
  payout_amount numeric NOT NULL,
  payout_method character varying NOT NULL CHECK (payout_method::text = ANY (ARRAY['bank_transfer'::character varying, 'upi'::character varying, 'cash'::character varying, 'cheque'::character varying]::text[])),
  payout_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (payout_status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])),
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  included_transactions ARRAY DEFAULT '{}'::text[],
  transaction_count integer DEFAULT 0,
  processed_by uuid,
  payment_reference character varying,
  bank_details jsonb,
  scheduled_date timestamp with time zone,
  processed_date timestamp with time zone,
  completed_date timestamp with time zone,
  notes text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.platform_wallet (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  total_commission_earned numeric DEFAULT 0,
  total_transaction_fees numeric DEFAULT 0,
  total_refunds_processed numeric DEFAULT 0,
  total_operational_costs numeric DEFAULT 0,
  today_commission numeric DEFAULT 0,
  week_commission numeric DEFAULT 0,
  month_commission numeric DEFAULT 0,
  year_commission numeric DEFAULT 0,
  total_transactions_processed integer DEFAULT 0,
  today_transactions integer DEFAULT 0,
  week_transactions integer DEFAULT 0,
  month_transactions integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_wallet_pkey PRIMARY KEY (id)
);
create table public.profiles (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  email text not null,
  role text not null,
  full_name text null,
  phone character varying(15) null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_user_id_key unique (user_id),
  constraint profiles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint profiles_role_check check (
    (
      role = any (
        array[
          'customer'::text,
          'vendor'::text,
          'delivery_partner'::text,
          'admin'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
create table public.sectors (
  id uuid not null default gen_random_uuid (),
  city_name character varying(100) not null,
  name character varying(100) not null,
  pincodes integer[] not null default '{}'::integer[],
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint sectors_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_sectors_city_active on public.sectors using btree (city_name, is_active) TABLESPACE pg_default;

create index IF not exists idx_sectors_pincodes on public.sectors using gin (pincodes) TABLESPACE pg_default;

create trigger update_sectors_updated_at BEFORE
update on sectors for EACH row
execute FUNCTION update_updated_at_column ();

create table public.shopping_carts (
  id uuid not null default extensions.uuid_generate_v4 (),
  customer_id uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint shopping_carts_pkey primary key (id),
  constraint shopping_carts_customer_id_key unique (customer_id),
  constraint shopping_carts_customer_id_fkey foreign KEY (customer_id) references customers (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_shopping_carts_customer_id on public.shopping_carts using btree (customer_id) TABLESPACE pg_default;

create trigger trigger_shopping_carts_updated_at BEFORE
update on shopping_carts for EACH row
execute FUNCTION update_updated_at_column ();

create table public.smartphone_models (
  id uuid not null default extensions.uuid_generate_v4 (),
  brand_id uuid not null,
  model_name character varying(200) not null,
  model_number character varying(100) null,
  release_year integer null,
  base_price numeric(10, 2) null,
  specifications jsonb null,
  official_images text[] null,
  description text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint smartphone_models_pkey primary key (id),
  constraint smartphone_models_brand_id_fkey foreign KEY (brand_id) references brands (id)
) TABLESPACE pg_default;

create trigger set_smartphone_models_updated_at BEFORE
update on smartphone_models for EACH row
execute FUNCTION update_updated_at_column ();

create trigger trigger_update_updated_at BEFORE
update on smartphone_models for EACH row
execute FUNCTION update_updated_at_column ();

CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  transaction_number character varying NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  order_item_id uuid,
  transaction_type character varying NOT NULL CHECK (transaction_type::text = ANY (ARRAY['order_payment'::character varying, 'commission_deduction'::character varying, 'vendor_earning'::character varying, 'delivery_incentive'::character varying, 'delivery_salary'::character varying, 'refund'::character varying, 'penalty'::character varying, 'bonus'::character varying, 'adjustment'::character varying]::text[])),
  transaction_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (transaction_status::text = ANY (ARRAY['pending'::character varying, 'processed'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying]::text[])),
  gross_amount numeric NOT NULL,
  commission_amount numeric DEFAULT 0,
  net_amount numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  from_party_type character varying CHECK (from_party_type::text = ANY (ARRAY['customer'::character varying, 'vendor'::character varying, 'delivery_partner'::character varying, 'platform'::character varying]::text[])),
  from_party_id uuid,
  to_party_type character varying CHECK (to_party_type::text = ANY (ARRAY['customer'::character varying, 'vendor'::character varying, 'delivery_partner'::character varying, 'platform'::character varying]::text[])),
  to_party_id uuid,
  commission_rule_id uuid,
  commission_override_id uuid,
  commission_rate_used numeric,
  transaction_date timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  completed_at timestamp with time zone,
  description text,
  metadata jsonb,
  payment_method character varying,
  payment_reference character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id),
  CONSTRAINT transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

create index IF not exists idx_transactions_order_id on public.transactions using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_type_status on public.transactions using btree (transaction_type, transaction_status) TABLESPACE pg_default;

create index IF not exists idx_transactions_date on public.transactions using btree (transaction_date) TABLESPACE pg_default;

create index IF not exists idx_transactions_parties on public.transactions using btree (
  from_party_type,
  from_party_id,
  to_party_type,
  to_party_id
) TABLESPACE pg_default;



CREATE TABLE public.vendor_addresses (
  vendor_id uuid NOT NULL,
  company_name text NOT NULL,
  pincode character varying NOT NULL,
  address_box text NOT NULL,
  phone_number1 character varying NOT NULL,
  phone_number2 character varying,
  phone_number3 character varying,
  phone_number4 character varying,
  phone_number5 character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vendor_addresses_pkey PRIMARY KEY (vendor_id),
  CONSTRAINT vendor_addresses_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);

create table public.vendor_commission_overrides (
  id uuid not null default gen_random_uuid (),
  vendor_id uuid not null,
  category_id uuid not null,
  commission_percentage numeric not null,
  minimum_commission numeric null default 0,
  maximum_commission numeric null,
  is_active boolean null default true,
  effective_from timestamp with time zone null default now(),
  effective_until timestamp with time zone null,
  created_by uuid null,
  reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  quality_id uuid null,
  smartphone_model_id uuid null,
  constraint vendor_commission_overrides_pkey primary key (id),
  constraint vendor_commission_overrides_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint vendor_commission_overrides_category_id_fkey foreign KEY (category_id) references categories (id),
  constraint vendor_commission_overrides_quality_id_fkey foreign KEY (quality_id) references category_qualities (id),
  constraint vendor_commission_overrides_smartphone_model_id_fkey foreign KEY (smartphone_model_id) references smartphone_models (id),
  constraint vendor_commission_overrides_vendor_id_fkey foreign KEY (vendor_id) references vendors (id),
  constraint vendor_commission_overrides_commission_percentage_check check (
    (
      (commission_percentage >= (0)::numeric)
      and (commission_percentage <= (100)::numeric)
    )
  )
) TABLESPACE pg_default;

create table public.vendor_commissions (
  id uuid not null default gen_random_uuid (),
  vendor_id uuid not null,
  quality_id uuid not null,
  commission_rate numeric not null,
  upside_rate numeric null default 0,
  is_active boolean null default true,
  effective_from timestamp with time zone null default now(),
  effective_until timestamp with time zone null,
  created_by uuid null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint vendor_commissions_pkey primary key (id),
  constraint vendor_commissions_vendor_quality_unique unique (vendor_id, quality_id),
  constraint vendor_commissions_quality_id_fkey foreign KEY (quality_id) references category_qualities (id),
  constraint vendor_commissions_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint vendor_commissions_vendor_id_fkey foreign KEY (vendor_id) references vendors (id),
  constraint vendor_commissions_commission_rate_check check (
    (
      (commission_rate >= (0)::numeric)
      and (commission_rate <= (100)::numeric)
    )
  ),
  constraint vendor_commissions_upside_rate_check check (
    (
      (upside_rate >= (0)::numeric)
      and (upside_rate <= (100)::numeric)
    )
  )
) TABLESPACE pg_default;

CREATE TABLE public.vendor_generic_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  vendor_id uuid NOT NULL,
  generic_product_id uuid NOT NULL,
  quality_type_id uuid NOT NULL,
  price numeric NOT NULL CHECK (price > 0::numeric),
  original_price numeric,
  discount_percentage integer DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_in_stock boolean DEFAULT true,
  low_stock_threshold integer DEFAULT 5,
  warranty_months integer DEFAULT 0,
  delivery_time_days integer DEFAULT 3,
  specifications jsonb,
  vendor_notes text,
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_generic_products_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_generic_products_quality_type_id_fkey FOREIGN KEY (quality_type_id) REFERENCES public.category_qualities(id),
  CONSTRAINT vendor_generic_products_generic_product_id_fkey FOREIGN KEY (generic_product_id) REFERENCES public.generic_products(id),
  CONSTRAINT vendor_generic_products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);
create table public.vendor_products (
  id uuid not null default extensions.uuid_generate_v4 (),
  vendor_id uuid not null,
  model_id uuid not null,
  category_id uuid not null,
  quality_type_id uuid not null,
  price numeric(10, 2) not null,
  original_price numeric(10, 2) null,
  discount_percentage integer null default 0,
  stock_quantity integer not null default 0,
  is_in_stock boolean null default true,
  low_stock_threshold integer null default 5,
  warranty_months integer null default 0,
  delivery_time_days integer null default 3,
  specifications jsonb null,
  vendor_notes text null,
  is_active boolean null default true,
  featured boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint vendor_products_pkey primary key (id),
  constraint vendor_products_category_id_fkey foreign KEY (category_id) references categories (id),
  constraint vendor_products_model_id_fkey foreign KEY (model_id) references smartphone_models (id),
  constraint vendor_products_quality_type_id_fkey foreign KEY (quality_type_id) references category_qualities (id) on delete set null,
  constraint vendor_products_vendor_id_fkey foreign KEY (vendor_id) references vendors (id),
  constraint vendor_products_price_check check ((price > (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_vendor_products_quality_type_id on public.vendor_products using btree (quality_type_id) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on vendor_products for EACH row
execute FUNCTION update_updated_at_column ();

create table public.vendor_wallets (
  id uuid not null default gen_random_uuid (),
  vendor_id uuid not null,
  available_balance numeric(10, 2) not null default 0.00,
  pending_balance numeric(10, 2) not null default 0.00,
  total_earned numeric(10, 2) not null default 0.00,
  total_paid_out numeric(10, 2) not null default 0.00,
  today_earnings numeric(10, 2) not null default 0.00,
  week_earnings numeric(10, 2) not null default 0.00,
  month_earnings numeric(10, 2) not null default 0.00,
  total_commission_paid numeric(10, 2) not null default 0.00,
  minimum_payout_amount numeric(10, 2) not null default 1000.00,
  payout_frequency character varying(20) null default 'weekly'::character varying,
  auto_payout_enabled boolean null default false,
  bank_account_number character varying(50) null,
  bank_ifsc_code character varying(20) null,
  bank_account_holder_name character varying(100) null,
  upi_id character varying(50) null,
  last_payout_date timestamp without time zone null,
  last_updated_balance_at timestamp without time zone null default CURRENT_TIMESTAMP,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  average_commission_rate numeric null,
  last_transaction_date timestamp with time zone null,
  constraint vendor_wallets_pkey primary key (id),
  constraint vendor_wallets_vendor_id_fkey foreign KEY (vendor_id) references vendors (id) on delete CASCADE,
  constraint vendor_wallets_payout_frequency_check check (
    (
      (payout_frequency)::text = any (
        (
          array[
            'daily'::character varying,
            'weekly'::character varying,
            'monthly'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_vendor_wallets_vendor_id on public.vendor_wallets using btree (vendor_id) TABLESPACE pg_default;

create index IF not exists idx_vendor_wallets_last_payout on public.vendor_wallets using btree (last_payout_date) TABLESPACE pg_default;

create index IF not exists idx_vendor_wallets_auto_payout on public.vendor_wallets using btree (auto_payout_enabled, minimum_payout_amount) TABLESPACE pg_default;

create unique INDEX IF not exists idx_vendor_wallets_unique_vendor on public.vendor_wallets using btree (vendor_id) TABLESPACE pg_default;

create trigger trigger_vendor_wallets_updated_at BEFORE
update on vendor_wallets for EACH row
execute FUNCTION update_vendor_wallets_updated_at ();

create table public.vendors (
  id uuid not null default extensions.uuid_generate_v4 (),
  profile_id uuid not null,
  business_name character varying(200) not null,
  business_registration character varying(100) null,
  gstin character varying(15) null,
  business_email character varying(255) null,
  rating numeric(3, 2) null default 0.00,
  total_reviews integer null default 0,
  total_sales integer null default 0,
  is_verified boolean null default false,
  is_active boolean null default true,
  auto_approve_orders boolean null default false,
  order_confirmation_timeout_minutes integer null default 15,
  auto_approve_under_amount numeric(10, 2) null,
  business_hours_start time without time zone null default '09:00:00'::time without time zone,
  business_hours_end time without time zone null default '18:00:00'::time without time zone,
  auto_approve_during_business_hours_only boolean null default true,
  joined_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint vendors_pkey primary key (id),
  constraint vendors_profile_id_key unique (profile_id),
  constraint vendors_profile_id_fkey foreign KEY (profile_id) references profiles (id) on delete CASCADE,
  constraint vendors_rating_check check (
    (
      (rating >= (0)::numeric)
      and (rating <= (5)::numeric)
    )
  )
) TABLESPACE pg_default;

create trigger trigger_update_updated_at BEFORE
update on vendors for EACH row
execute FUNCTION update_updated_at_column ();