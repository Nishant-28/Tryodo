-- Supabase Migration: Update Address Concept for Customers and Vendors

-- Remove existing customer_addresses and any vendor_addresses
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS vendor_addresses CASCADE;

-- Remove embedded address fields from vendors
ALTER TABLE vendors
  DROP COLUMN IF EXISTS business_address,
  DROP COLUMN IF EXISTS business_city,
  DROP COLUMN IF EXISTS business_state,
  DROP COLUMN IF EXISTS business_pincode,
  DROP COLUMN IF EXISTS contact_person,
  DROP COLUMN IF EXISTS contact_phone;

-- Create new customer_addresses table
CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  pincode varchar NOT NULL,
  address_box text NOT NULL,
  phone_number varchar NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create new vendor_addresses table (one row per vendor)
CREATE TABLE vendor_addresses (
  vendor_id uuid PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  pincode varchar NOT NULL,
  address_box text NOT NULL,
  phone_number1 varchar NOT NULL,
  phone_number2 varchar,
  phone_number3 varchar,
  phone_number4 varchar,
  phone_number5 varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
); 