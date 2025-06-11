-- Phone Parts Marketplace Database Schema for Supabase
-- This schema supports multi-vendor marketplace for phone parts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BRANDS TABLE (Master Data)
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MODELS TABLE (Master Data)
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    full_name VARCHAR(200) NOT NULL, -- e.g., "iPhone 14 Pro Max"
    release_year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, name)
);

-- 3. CATEGORIES TABLE (Master Data)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE, -- Display, Battery, Cable, Charger, Earphone, Tempered Glass
    description TEXT,
    icon VARCHAR(50), -- lucide icon name
    gradient VARCHAR(100), -- CSS gradient
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. QUALITY TYPES TABLE (Master Data - Admin Defined)
CREATE TABLE quality_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- TFT, Normal, OG, ORG, Original for Display
    description TEXT,
    sort_order INTEGER DEFAULT 0, -- for ordering quality levels
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- 5. GENERIC PRODUCTS TABLE (For cables, chargers, etc.)
CREATE TABLE generic_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- USB-C Cable, Lightning Cable, etc.
    description TEXT,
    specifications JSONB, -- {"connector_type": "USB-C", "length": "1m", etc.}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. VENDORS TABLE
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to auth.users if using Supabase Auth
    business_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(150),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gstin VARCHAR(15),
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    response_time_hours INTEGER DEFAULT 24,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. VENDOR PRODUCTS TABLE (Phone-specific products)
CREATE TABLE vendor_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    quality_type_id UUID NOT NULL REFERENCES quality_types(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    original_price DECIMAL(10,2), -- for showing discounts
    warranty_months INTEGER NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_in_stock BOOLEAN GENERATED ALWAYS AS (stock_quantity > 0) STORED,
    delivery_time_days INTEGER DEFAULT 3,
    product_images TEXT[], -- Array of image URLs
    specifications JSONB, -- Additional specs specific to this product
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendor_id, model_id, category_id, quality_type_id)
);

-- 8. VENDOR GENERIC PRODUCTS TABLE (Generic products like cables)
CREATE TABLE vendor_generic_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    generic_product_id UUID NOT NULL REFERENCES generic_products(id) ON DELETE CASCADE,
    quality_type_id UUID NOT NULL REFERENCES quality_types(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    original_price DECIMAL(10,2),
    warranty_months INTEGER NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_in_stock BOOLEAN GENERATED ALWAYS AS (stock_quantity > 0) STORED,
    delivery_time_days INTEGER DEFAULT 3,
    product_images TEXT[],
    specifications JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vendor_id, generic_product_id, quality_type_id)
);

-- 9. CUSTOMERS TABLE
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to auth.users if using Supabase Auth
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. ORDERS TABLE
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status values: pending, confirmed, processing, shipped, delivered, cancelled, returned
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Payment status: pending, paid, failed, refunded
    payment_method VARCHAR(50),
    delivery_address TEXT NOT NULL,
    delivery_city VARCHAR(100) NOT NULL,
    delivery_state VARCHAR(100) NOT NULL,
    delivery_pincode VARCHAR(10) NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ORDER ITEMS TABLE
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    -- For phone-specific products
    vendor_product_id UUID REFERENCES vendor_products(id) ON DELETE CASCADE,
    -- For generic products
    vendor_generic_product_id UUID REFERENCES vendor_generic_products(id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL, -- Store name at time of order
    quality_type VARCHAR(100) NOT NULL, -- Store quality at time of order
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (price * quantity) STORED,
    warranty_months INTEGER NOT NULL DEFAULT 0,
    delivery_time_days INTEGER DEFAULT 3,
    item_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Item status: pending, confirmed, processing, shipped, delivered, cancelled, returned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (vendor_product_id IS NOT NULL AND vendor_generic_product_id IS NULL) OR
        (vendor_product_id IS NULL AND vendor_generic_product_id IS NOT NULL)
    )
);

-- 12. VENDOR REVIEWS TABLE
CREATE TABLE vendor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, order_id, vendor_id)
);

-- 13. INVENTORY LOGS TABLE (For tracking stock changes)
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    vendor_product_id UUID REFERENCES vendor_products(id) ON DELETE CASCADE,
    vendor_generic_product_id UUID REFERENCES vendor_generic_products(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL, -- 'stock_in', 'stock_out', 'adjustment', 'order'
    quantity_change INTEGER NOT NULL, -- Positive for increase, negative for decrease
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (vendor_product_id IS NOT NULL AND vendor_generic_product_id IS NULL) OR
        (vendor_product_id IS NULL AND vendor_generic_product_id IS NOT NULL)
    )
);

-- INDEXES for better performance
CREATE INDEX idx_models_brand_id ON models(brand_id);
CREATE INDEX idx_quality_types_category_id ON quality_types(category_id);
CREATE INDEX idx_vendor_products_vendor_id ON vendor_products(vendor_id);
CREATE INDEX idx_vendor_products_model_id ON vendor_products(model_id);
CREATE INDEX idx_vendor_products_category_id ON vendor_products(category_id);
CREATE INDEX idx_vendor_products_stock ON vendor_products(is_in_stock, is_active);
CREATE INDEX idx_vendor_generic_products_vendor_id ON vendor_generic_products(vendor_id);
CREATE INDEX idx_vendor_generic_products_generic_product_id ON vendor_generic_products(generic_product_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_vendor_id ON order_items(vendor_id);
CREATE INDEX idx_vendor_reviews_vendor_id ON vendor_reviews(vendor_id);
CREATE INDEX idx_inventory_logs_vendor_id ON inventory_logs(vendor_id);

-- TRIGGERS for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_quality_types_updated_at BEFORE UPDATE ON quality_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_vendor_products_updated_at BEFORE UPDATE ON vendor_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_vendor_generic_products_updated_at BEFORE UPDATE ON vendor_generic_products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FUNCTION to update vendor ratings when reviews are added/updated
CREATE OR REPLACE FUNCTION update_vendor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vendors SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 1) 
            FROM vendor_reviews 
            WHERE vendor_id = NEW.vendor_id
        ),
        total_reviews = (
            SELECT COUNT(*) 
            FROM vendor_reviews 
            WHERE vendor_id = NEW.vendor_id
        )
    WHERE id = NEW.vendor_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vendor_rating_trigger 
    AFTER INSERT OR UPDATE ON vendor_reviews
    FOR EACH ROW EXECUTE FUNCTION update_vendor_rating();

-- FUNCTION to log inventory changes
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.stock_quantity != NEW.stock_quantity THEN
        IF TG_TABLE_NAME = 'vendor_products' THEN
            INSERT INTO inventory_logs (
                vendor_id, vendor_product_id, change_type, 
                quantity_change, previous_stock, new_stock, reason
            ) VALUES (
                NEW.vendor_id, NEW.id, 'adjustment',
                NEW.stock_quantity - OLD.stock_quantity, 
                OLD.stock_quantity, NEW.stock_quantity,
                'Stock updated by vendor'
            );
        ELSIF TG_TABLE_NAME = 'vendor_generic_products' THEN
            INSERT INTO inventory_logs (
                vendor_id, vendor_generic_product_id, change_type, 
                quantity_change, previous_stock, new_stock, reason
            ) VALUES (
                NEW.vendor_id, NEW.id, 'adjustment',
                NEW.stock_quantity - OLD.stock_quantity, 
                OLD.stock_quantity, NEW.stock_quantity,
                'Stock updated by vendor'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_vendor_products_inventory 
    AFTER UPDATE ON vendor_products
    FOR EACH ROW EXECUTE FUNCTION log_inventory_change();
    
CREATE TRIGGER log_vendor_generic_products_inventory 
    AFTER UPDATE ON vendor_generic_products
    FOR EACH ROW EXECUTE FUNCTION log_inventory_change();