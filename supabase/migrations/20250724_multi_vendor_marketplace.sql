-- Multi-Vendor Marketplace Database Schema Migration
-- This migration creates the complete database schema for the marketplace feature

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Market Categories Table
CREATE TABLE IF NOT EXISTS public.market_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES market_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  seo_title VARCHAR(255),
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for market_categories
CREATE INDEX IF NOT EXISTS idx_market_categories_parent_id ON public.market_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_market_categories_slug ON public.market_categories(slug);
CREATE INDEX IF NOT EXISTS idx_market_categories_active ON public.market_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_market_categories_sort_order ON public.market_categories(sort_order);

-- 2. Market Brands Table
CREATE TABLE IF NOT EXISTS public.market_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website_url TEXT,
  brand_guidelines TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for market_brands
CREATE INDEX IF NOT EXISTS idx_market_brands_slug ON public.market_brands(slug);
CREATE INDEX IF NOT EXISTS idx_market_brands_active ON public.market_brands(is_active);
CREATE INDEX IF NOT EXISTS idx_market_brands_name ON public.market_brands(name);

-- 3. Market Products Table
CREATE TABLE IF NOT EXISTS public.market_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  specifications JSONB DEFAULT '{}'::jsonb, -- Product specifications as key-value pairs
  category_id UUID NOT NULL REFERENCES market_categories(id) ON DELETE RESTRICT,
  brand_id UUID NOT NULL REFERENCES market_brands(id) ON DELETE RESTRICT,
  base_unit VARCHAR(50), -- kg, piece, liter, etc.
  weight DECIMAL(10,3),
  dimensions JSONB, -- {length, width, height}
  meta_title VARCHAR(255),
  meta_description TEXT,
  keywords TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for market_products
CREATE INDEX IF NOT EXISTS idx_market_products_category_id ON public.market_products(category_id);
CREATE INDEX IF NOT EXISTS idx_market_products_brand_id ON public.market_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_market_products_slug ON public.market_products(slug);
CREATE INDEX IF NOT EXISTS idx_market_products_active ON public.market_products(is_active);
CREATE INDEX IF NOT EXISTS idx_market_products_name ON public.market_products USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_market_products_description ON public.market_products USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_market_products_created_by ON public.market_products(created_by);

-- 4. Market Vendor Product Requests Table
CREATE TABLE IF NOT EXISTS public.market_vendor_product_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  market_product_id UUID NOT NULL REFERENCES market_products(id) ON DELETE CASCADE,
  proposed_price DECIMAL(10,2) NOT NULL CHECK (proposed_price > 0),
  stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
  delivery_time_hours INTEGER NOT NULL CHECK (delivery_time_hours > 0),
  special_terms TEXT,
  business_justification TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, market_product_id)
);

-- Create indexes for market_vendor_product_requests
CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_vendor_id ON public.market_vendor_product_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_product_id ON public.market_vendor_product_requests(market_product_id);
CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_status ON public.market_vendor_product_requests(status);
CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_reviewed_by ON public.market_vendor_product_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_created_at ON public.market_vendor_product_requests(created_at);

-- 5. Market Vendor Products Table (Approved Listings)
CREATE TABLE IF NOT EXISTS public.market_vendor_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  market_product_id UUID NOT NULL REFERENCES market_products(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  original_price DECIMAL(10,2) CHECK (original_price IS NULL OR original_price >= price),
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_in_stock BOOLEAN DEFAULT TRUE,
  low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
  delivery_time_hours INTEGER NOT NULL CHECK (delivery_time_hours > 0),
  min_order_quantity INTEGER DEFAULT 1 CHECK (min_order_quantity > 0),
  max_order_quantity INTEGER CHECK (max_order_quantity IS NULL OR max_order_quantity >= min_order_quantity),
  vendor_notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  featured BOOLEAN DEFAULT FALSE,
  last_stock_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, market_product_id)
);

-- Create indexes for market_vendor_products
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_vendor_id ON public.market_vendor_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_product_id ON public.market_vendor_products(market_product_id);
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_active ON public.market_vendor_products(is_active);
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_in_stock ON public.market_vendor_products(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_price ON public.market_vendor_products(price);
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_featured ON public.market_vendor_products(featured);
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_delivery_time ON public.market_vendor_products(delivery_time_hours);
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_stock_quantity ON public.market_vendor_products(stock_quantity);

-- 6. Extend cart_items table for marketplace integration
-- Add new column to support market vendor products (non-breaking change)
ALTER TABLE public.cart_items 
ADD COLUMN IF NOT EXISTS market_vendor_product_id UUID REFERENCES market_vendor_products(id) ON DELETE CASCADE;

-- Update cart_items constraint to allow either existing products or market products
-- First, drop the existing constraint if it exists
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

-- Add new constraint to ensure only one product type is referenced
ALTER TABLE public.cart_items 
ADD CONSTRAINT cart_items_check_product_reference 
CHECK (
  (product_id IS NOT NULL AND market_vendor_product_id IS NULL) OR 
  (product_id IS NULL AND market_vendor_product_id IS NOT NULL)
);

-- Re-add the existing foreign key constraint
ALTER TABLE public.cart_items 
ADD CONSTRAINT cart_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES vendor_products(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_cart_items_market_vendor_product_id ON public.cart_items(market_vendor_product_id);

-- Update unique constraint to handle both product types
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_cart_id_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_existing_product 
ON public.cart_items(cart_id, product_id) 
WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_unique_market_product 
ON public.cart_items(cart_id, market_vendor_product_id) 
WHERE market_vendor_product_id IS NOT NULL;

-- 7. Extend order_items table for marketplace integration
-- Add columns to support market vendor products
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS market_vendor_product_id UUID REFERENCES market_vendor_products(id) ON DELETE SET NULL;

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(20) DEFAULT 'existing' 
CHECK (product_type IN ('existing', 'marketplace'));

-- Add constraint to ensure proper product reference based on type
ALTER TABLE public.order_items 
ADD CONSTRAINT IF NOT EXISTS order_items_product_check 
CHECK (
  (product_type = 'existing' AND vendor_product_id IS NOT NULL AND market_vendor_product_id IS NULL) OR
  (product_type = 'marketplace' AND vendor_product_id IS NULL AND market_vendor_product_id IS NOT NULL)
);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_order_items_market_vendor_product_id ON public.order_items(market_vendor_product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_type ON public.order_items(product_type);

-- 8. Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all new tables
CREATE TRIGGER trigger_market_categories_updated_at 
BEFORE UPDATE ON public.market_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_market_brands_updated_at 
BEFORE UPDATE ON public.market_brands 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_market_products_updated_at 
BEFORE UPDATE ON public.market_products 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_market_vendor_requests_updated_at 
BEFORE UPDATE ON public.market_vendor_product_requests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_market_vendor_products_updated_at 
BEFORE UPDATE ON public.market_vendor_products 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create function to automatically update stock status
CREATE OR REPLACE FUNCTION update_market_product_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update is_in_stock based on stock_quantity
    NEW.is_in_stock = CASE WHEN NEW.stock_quantity > 0 THEN TRUE ELSE FALSE END;
    NEW.last_stock_update = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply stock status trigger
CREATE TRIGGER trigger_market_vendor_products_stock_status 
BEFORE UPDATE OF stock_quantity ON public.market_vendor_products 
FOR EACH ROW EXECUTE FUNCTION update_market_product_stock_status();

-- 10. Create function to handle stock deduction for marketplace products
CREATE OR REPLACE FUNCTION update_marketplace_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_type = 'marketplace' AND NEW.market_vendor_product_id IS NOT NULL THEN
        UPDATE market_vendor_products 
        SET stock_quantity = stock_quantity - NEW.quantity,
            is_in_stock = CASE WHEN stock_quantity - NEW.quantity <= 0 THEN FALSE ELSE TRUE END,
            last_stock_update = NOW()
        WHERE id = NEW.market_vendor_product_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply stock deduction trigger to order_items
CREATE TRIGGER trigger_marketplace_stock_deduction 
AFTER INSERT ON public.order_items 
FOR EACH ROW EXECUTE FUNCTION update_marketplace_stock_on_order();

-- 11. Create RLS (Row Level Security) policies

-- Enable RLS on all new tables
ALTER TABLE public.market_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_vendor_product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_vendor_products ENABLE ROW LEVEL SECURITY;

-- Market Categories policies
CREATE POLICY "Market categories are viewable by everyone" ON public.market_categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage market categories" ON public.market_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Market Brands policies
CREATE POLICY "Market brands are viewable by everyone" ON public.market_brands
FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage market brands" ON public.market_brands
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Market Products policies
CREATE POLICY "Market products are viewable by everyone" ON public.market_products
FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage market products" ON public.market_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Market Vendor Product Requests policies
CREATE POLICY "Vendors can view their own requests" ON public.market_vendor_product_requests
FOR SELECT USING (
  vendor_id IN (
    SELECT id FROM vendors 
    WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Vendors can create requests" ON public.market_vendor_product_requests
FOR INSERT WITH CHECK (
  vendor_id IN (
    SELECT id FROM vendors 
    WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Vendors can update their pending requests" ON public.market_vendor_product_requests
FOR UPDATE USING (
  vendor_id IN (
    SELECT id FROM vendors 
    WHERE profile_id = auth.uid()
  ) AND status = 'pending'
);

CREATE POLICY "Admins can manage all requests" ON public.market_vendor_product_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Market Vendor Products policies
CREATE POLICY "Market vendor products are viewable by everyone" ON public.market_vendor_products
FOR SELECT USING (is_active = true);

CREATE POLICY "Vendors can manage their own products" ON public.market_vendor_products
FOR ALL USING (
  vendor_id IN (
    SELECT id FROM vendors 
    WHERE profile_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all vendor products" ON public.market_vendor_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 12. Create helpful views for common queries

-- View for market products with vendor information
CREATE OR REPLACE VIEW public.market_products_with_vendors AS
SELECT 
  mp.id,
  mp.name,
  mp.slug,
  mp.description,
  mp.images,
  mp.specifications,
  mc.name as category_name,
  mc.slug as category_slug,
  mb.name as brand_name,
  mb.slug as brand_slug,
  mb.logo_url as brand_logo,
  COUNT(mvp.id) as vendor_count,
  MIN(mvp.price) as min_price,
  MAX(mvp.price) as max_price,
  MIN(mvp.delivery_time_hours) as fastest_delivery_hours,
  SUM(mvp.stock_quantity) as total_stock,
  BOOL_OR(mvp.is_in_stock AND mvp.is_active) as has_available_stock
FROM market_products mp
LEFT JOIN market_categories mc ON mp.category_id = mc.id
LEFT JOIN market_brands mb ON mp.brand_id = mb.id
LEFT JOIN market_vendor_products mvp ON mp.id = mvp.market_product_id 
  AND mvp.is_active = true
WHERE mp.is_active = true
GROUP BY mp.id, mp.name, mp.slug, mp.description, mp.images, mp.specifications,
         mc.name, mc.slug, mb.name, mb.slug, mb.logo_url;

-- View for vendor product comparison
CREATE OR REPLACE VIEW public.market_vendor_product_comparison AS
SELECT 
  mvp.id,
  mvp.vendor_id,
  mvp.market_product_id,
  mvp.price,
  mvp.original_price,
  mvp.discount_percentage,
  mvp.stock_quantity,
  mvp.is_in_stock,
  mvp.delivery_time_hours,
  mvp.is_active,
  mvp.featured,
  v.business_name as vendor_name,
  v.rating as vendor_rating,
  mp.name as product_name,
  mp.slug as product_slug,
  mp.images as product_images,
  mc.name as category_name,
  mb.name as brand_name
FROM market_vendor_products mvp
JOIN vendors v ON mvp.vendor_id = v.id
JOIN market_products mp ON mvp.market_product_id = mp.id
JOIN market_categories mc ON mp.category_id = mc.id
JOIN market_brands mb ON mp.brand_id = mb.id
WHERE mvp.is_active = true AND mp.is_active = true;

-- Add comments for documentation
COMMENT ON TABLE public.market_categories IS 'Categories for marketplace products managed by admin';
COMMENT ON TABLE public.market_brands IS 'Brands for marketplace products managed by admin';
COMMENT ON TABLE public.market_products IS 'Admin-managed product catalog for marketplace';
COMMENT ON TABLE public.market_vendor_product_requests IS 'Vendor requests to sell specific market products';
COMMENT ON TABLE public.market_vendor_products IS 'Approved vendor products available in marketplace';

COMMENT ON COLUMN public.cart_items.market_vendor_product_id IS 'Reference to marketplace product (mutually exclusive with product_id)';
COMMENT ON COLUMN public.order_items.market_vendor_product_id IS 'Reference to marketplace product for order items';
COMMENT ON COLUMN public.order_items.product_type IS 'Distinguishes between existing and marketplace products';