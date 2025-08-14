-- Performance Optimization Migration
-- This migration adds comprehensive indexing and query optimizations for the marketplace

-- 1. Advanced indexing for marketplace tables

-- Market Products - Optimize search and filtering
CREATE INDEX IF NOT EXISTS idx_market_products_search_vector ON public.market_products 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_market_products_category_active ON public.market_products(category_id, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_market_products_brand_active ON public.market_products(brand_id, is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_market_products_created_at_desc ON public.market_products(created_at DESC) 
WHERE is_active = TRUE;

-- Market Vendor Products - Optimize vendor comparison and stock queries
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_product_price ON public.market_vendor_products(market_product_id, price) 
WHERE is_active = TRUE AND is_in_stock = TRUE;

CREATE INDEX IF NOT EXISTS idx_market_vendor_products_vendor_active ON public.market_vendor_products(vendor_id, is_active, is_in_stock);

CREATE INDEX IF NOT EXISTS idx_market_vendor_products_delivery_time ON public.market_vendor_products(delivery_time_hours) 
WHERE is_active = TRUE AND is_in_stock = TRUE;

CREATE INDEX IF NOT EXISTS idx_market_vendor_products_stock_alerts ON public.market_vendor_products(vendor_id, stock_quantity, low_stock_threshold) 
WHERE is_active = TRUE AND (stock_quantity <= low_stock_threshold OR is_in_stock = FALSE);

CREATE INDEX IF NOT EXISTS idx_market_vendor_products_featured ON public.market_vendor_products(featured, is_active, is_in_stock) 
WHERE featured = TRUE AND is_active = TRUE;

-- Composite index for price range filtering
CREATE INDEX IF NOT EXISTS idx_market_vendor_products_price_range ON public.market_vendor_products(market_product_id, price, is_active, is_in_stock) 
WHERE is_active = TRUE AND is_in_stock = TRUE;

-- Market Vendor Product Requests - Optimize admin review queries
CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_status_created ON public.market_vendor_product_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_vendor_status ON public.market_vendor_product_requests(vendor_id, status);

CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_product_status ON public.market_vendor_product_requests(market_product_id, status);

CREATE INDEX IF NOT EXISTS idx_market_vendor_requests_reviewed_at ON public.market_vendor_product_requests(reviewed_at DESC) 
WHERE reviewed_at IS NOT NULL;

-- Order Items - Optimize marketplace order queries
CREATE INDEX IF NOT EXISTS idx_order_items_marketplace_vendor ON public.order_items(market_vendor_product_id, product_type) 
WHERE product_type = 'marketplace';

CREATE INDEX IF NOT EXISTS idx_order_items_vendor_marketplace ON public.order_items(vendor_id, product_type, item_status) 
WHERE product_type = 'marketplace';

CREATE INDEX IF NOT EXISTS idx_order_items_order_marketplace ON public.order_items(order_id, product_type) 
WHERE product_type = 'marketplace';

-- Cart Items - Optimize cart operations
CREATE INDEX IF NOT EXISTS idx_cart_items_marketplace_vendor ON public.cart_items(market_vendor_product_id) 
WHERE market_vendor_product_id IS NOT NULL;

-- Stock History - Optimize analytics queries
CREATE INDEX IF NOT EXISTS idx_stock_history_product_date ON public.market_stock_history(market_vendor_product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_history_change_type_date ON public.market_stock_history(change_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_history_order_id ON public.market_stock_history(order_id) 
WHERE order_id IS NOT NULL;

-- Stock Notifications - Optimize vendor notification queries
CREATE INDEX IF NOT EXISTS idx_stock_notifications_vendor_unread ON public.stock_notifications(vendor_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_notifications_type_created ON public.stock_notifications(notification_type, created_at DESC);

-- 2. Optimize existing table indexes

-- Vendors table optimization
CREATE INDEX IF NOT EXISTS idx_vendors_active_verified ON public.vendors(is_active, is_verified) 
WHERE is_active = TRUE AND is_verified = TRUE;

CREATE INDEX IF NOT EXISTS idx_vendors_rating_desc ON public.vendors(rating DESC) 
WHERE is_active = TRUE AND is_verified = TRUE;

-- Orders table optimization for marketplace analytics
CREATE INDEX IF NOT EXISTS idx_orders_status_created_marketplace ON public.orders(order_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON public.orders(customer_id, created_at DESC);

-- 3. Create optimized views for common queries

-- Optimized view for marketplace product listings with vendor information
CREATE OR REPLACE VIEW marketplace_product_listings AS
SELECT 
    mp.id as product_id,
    mp.name as product_name,
    mp.slug as product_slug,
    mp.description,
    mp.images,
    mp.specifications,
    mc.name as category_name,
    mc.slug as category_slug,
    mb.name as brand_name,
    mb.slug as brand_slug,
    mb.logo_url as brand_logo,
    -- Aggregated vendor data
    COUNT(mvp.id) as vendor_count,
    MIN(mvp.price) as min_price,
    MAX(mvp.price) as max_price,
    AVG(mvp.price) as avg_price,
    MIN(mvp.delivery_time_hours) as fastest_delivery_hours,
    MAX(mvp.delivery_time_hours) as slowest_delivery_hours,
    SUM(mvp.stock_quantity) as total_stock,
    BOOL_OR(mvp.is_in_stock AND mvp.is_active) as has_available_stock,
    COUNT(mvp.id) FILTER (WHERE mvp.featured = TRUE) as featured_vendor_count,
    -- Best vendor info
    (SELECT jsonb_build_object(
        'vendor_id', v.id,
        'vendor_name', v.business_name,
        'price', mvp_best.price,
        'delivery_time', mvp_best.delivery_time_hours,
        'rating', v.rating
    ) FROM market_vendor_products mvp_best
    JOIN vendors v ON mvp_best.vendor_id = v.id
    WHERE mvp_best.market_product_id = mp.id 
    AND mvp_best.is_active = TRUE 
    AND mvp_best.is_in_stock = TRUE
    ORDER BY mvp_best.price ASC, v.rating DESC
    LIMIT 1) as best_offer
FROM market_products mp
JOIN market_categories mc ON mp.category_id = mc.id
JOIN market_brands mb ON mp.brand_id = mb.id
LEFT JOIN market_vendor_products mvp ON mp.id = mvp.market_product_id 
    AND mvp.is_active = TRUE
WHERE mp.is_active = TRUE
GROUP BY mp.id, mp.name, mp.slug, mp.description, mp.images, mp.specifications,
         mc.name, mc.slug, mb.name, mb.slug, mb.logo_url
HAVING BOOL_OR(mvp.is_in_stock AND mvp.is_active) = TRUE;

-- Optimized view for vendor product management
CREATE OR REPLACE VIEW vendor_marketplace_products AS
SELECT 
    mvp.id,
    mvp.vendor_id,
    mvp.price,
    mvp.original_price,
    mvp.discount_percentage,
    mvp.stock_quantity,
    mvp.is_in_stock,
    mvp.low_stock_threshold,
    mvp.delivery_time_hours,
    mvp.is_active,
    mvp.featured,
    mvp.last_stock_update,
    mvp.created_at,
    mvp.updated_at,
    mp.id as market_product_id,
    mp.name as product_name,
    mp.slug as product_slug,
    mp.images as product_images,
    mp.specifications,
    mc.name as category_name,
    mb.name as brand_name,
    v.business_name as vendor_name,
    -- Stock status indicators
    CASE 
        WHEN mvp.stock_quantity = 0 THEN 'out_of_stock'
        WHEN mvp.stock_quantity <= mvp.low_stock_threshold THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status,
    -- Performance metrics (would need order data for accurate calculation)
    0 as total_orders,
    0 as total_revenue
FROM market_vendor_products mvp
JOIN market_products mp ON mvp.market_product_id = mp.id
JOIN market_categories mc ON mp.category_id = mc.id
JOIN market_brands mb ON mp.brand_id = mb.id
JOIN vendors v ON mvp.vendor_id = v.id
WHERE mvp.is_active = TRUE AND mp.is_active = TRUE;

-- 4. Create materialized views for heavy analytics queries (refresh periodically)

-- Materialized view for marketplace analytics (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS marketplace_analytics_daily AS
SELECT 
    CURRENT_DATE as analytics_date,
    -- Product metrics
    COUNT(DISTINCT mp.id) as total_market_products,
    COUNT(DISTINCT mvp.id) as total_vendor_products,
    COUNT(DISTINCT mvp.id) FILTER (WHERE mvp.is_active = TRUE) as active_vendor_products,
    COUNT(DISTINCT mvp.id) FILTER (WHERE mvp.is_active = TRUE AND mvp.is_in_stock = TRUE) as products_in_stock,
    COUNT(DISTINCT mvp.id) FILTER (WHERE mvp.is_active = TRUE AND mvp.is_in_stock = FALSE) as products_out_of_stock,
    COUNT(DISTINCT mvp.id) FILTER (WHERE mvp.is_active = TRUE AND mvp.stock_quantity <= mvp.low_stock_threshold) as products_low_stock,
    
    -- Vendor metrics
    COUNT(DISTINCT v.id) as total_vendors,
    COUNT(DISTINCT v.id) FILTER (WHERE v.is_active = TRUE) as active_vendors,
    COUNT(DISTINCT mvp.vendor_id) as vendors_with_products,
    
    -- Stock metrics
    SUM(mvp.stock_quantity) FILTER (WHERE mvp.is_active = TRUE) as total_stock_units,
    AVG(mvp.stock_quantity) FILTER (WHERE mvp.is_active = TRUE) as avg_stock_per_product,
    
    -- Price metrics
    AVG(mvp.price) FILTER (WHERE mvp.is_active = TRUE AND mvp.is_in_stock = TRUE) as avg_product_price,
    MIN(mvp.price) FILTER (WHERE mvp.is_active = TRUE AND mvp.is_in_stock = TRUE) as min_product_price,
    MAX(mvp.price) FILTER (WHERE mvp.is_active = TRUE AND mvp.is_in_stock = TRUE) as max_product_price,
    
    -- Category and brand metrics
    COUNT(DISTINCT mc.id) as total_categories,
    COUNT(DISTINCT mb.id) as total_brands,
    COUNT(DISTINCT mp.category_id) as categories_with_products,
    COUNT(DISTINCT mp.brand_id) as brands_with_products
FROM market_products mp
LEFT JOIN market_vendor_products mvp ON mp.id = mvp.market_product_id
LEFT JOIN vendors v ON mvp.vendor_id = v.id
LEFT JOIN market_categories mc ON mp.category_id = mc.id
LEFT JOIN market_brands mb ON mp.brand_id = mb.id
WHERE mp.is_active = TRUE;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_analytics_daily_date 
ON marketplace_analytics_daily(analytics_date);

-- 5. Create functions for optimized queries

-- Function to get marketplace products with filters (optimized)
CREATE OR REPLACE FUNCTION get_marketplace_products_optimized(
    p_category_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'name',
    p_sort_order TEXT DEFAULT 'ASC',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    product_slug TEXT,
    category_name TEXT,
    brand_name TEXT,
    brand_logo TEXT,
    min_price DECIMAL,
    max_price DECIMAL,
    vendor_count BIGINT,
    fastest_delivery_hours INTEGER,
    total_stock BIGINT,
    has_stock BOOLEAN,
    product_images JSONB
) AS $
DECLARE
    query_text TEXT;
    sort_column TEXT;
BEGIN
    -- Determine sort column
    sort_column := CASE p_sort_by
        WHEN 'price' THEN 'min_price'
        WHEN 'delivery' THEN 'fastest_delivery_hours'
        WHEN 'popularity' THEN 'vendor_count'
        ELSE 'product_name'
    END;
    
    -- Build dynamic query with proper indexing
    query_text := '
    SELECT 
        mpl.product_id,
        mpl.product_name,
        mpl.product_slug,
        mpl.category_name,
        mpl.brand_name,
        mpl.brand_logo,
        mpl.min_price,
        mpl.max_price,
        mpl.vendor_count,
        mpl.fastest_delivery_hours,
        mpl.total_stock,
        mpl.has_available_stock,
        mpl.images
    FROM marketplace_product_listings mpl
    WHERE 1=1';
    
    -- Add filters
    IF p_category_id IS NOT NULL THEN
        query_text := query_text || ' AND mpl.category_id = $1';
    END IF;
    
    IF p_brand_id IS NOT NULL THEN
        query_text := query_text || ' AND mpl.brand_id = $2';
    END IF;
    
    IF p_min_price IS NOT NULL THEN
        query_text := query_text || ' AND mpl.min_price >= $3';
    END IF;
    
    IF p_max_price IS NOT NULL THEN
        query_text := query_text || ' AND mpl.max_price <= $4';
    END IF;
    
    IF p_search_term IS NOT NULL THEN
        query_text := query_text || ' AND (mpl.product_name ILIKE $5 OR mpl.category_name ILIKE $5 OR mpl.brand_name ILIKE $5)';
    END IF;
    
    -- Add sorting and pagination
    query_text := query_text || ' ORDER BY ' || sort_column || ' ' || p_sort_order;
    query_text := query_text || ' LIMIT $6 OFFSET $7';
    
    -- Execute dynamic query
    RETURN QUERY EXECUTE query_text 
    USING p_category_id, p_brand_id, p_min_price, p_max_price, '%' || p_search_term || '%', p_limit, p_offset;
END;
$ language 'plpgsql';

-- Function to get vendor products with optimized joins
CREATE OR REPLACE FUNCTION get_vendor_marketplace_products_optimized(
    p_vendor_id UUID,
    p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    product_id UUID,
    vendor_product_id UUID,
    product_name TEXT,
    category_name TEXT,
    brand_name TEXT,
    price DECIMAL,
    stock_quantity INTEGER,
    is_in_stock BOOLEAN,
    stock_status TEXT,
    delivery_time_hours INTEGER,
    is_active BOOLEAN,
    last_stock_update TIMESTAMPTZ
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        vmp.market_product_id,
        vmp.id,
        vmp.product_name,
        vmp.category_name,
        vmp.brand_name,
        vmp.price,
        vmp.stock_quantity,
        vmp.is_in_stock,
        vmp.stock_status,
        vmp.delivery_time_hours,
        vmp.is_active,
        vmp.last_stock_update
    FROM vendor_marketplace_products vmp
    WHERE vmp.vendor_id = p_vendor_id
    AND (p_include_inactive OR vmp.is_active = TRUE)
    ORDER BY vmp.stock_status DESC, vmp.product_name;
END;
$ language 'plpgsql';

-- 6. Create indexes for analytics queries

-- Indexes for order analytics
CREATE INDEX IF NOT EXISTS idx_orders_marketplace_analytics ON public.orders(created_at, order_status) 
WHERE order_status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_order_items_marketplace_analytics ON public.order_items(product_type, created_at, line_total) 
WHERE product_type = 'marketplace';

-- Indexes for vendor analytics
CREATE INDEX IF NOT EXISTS idx_vendors_performance ON public.vendors(is_active, is_verified, rating DESC, total_sales DESC);

-- 7. Add query hints and optimization settings

-- Enable parallel query execution for analytics
ALTER DATABASE postgres SET max_parallel_workers_per_gather = 4;
ALTER DATABASE postgres SET parallel_tuple_cost = 0.1;
ALTER DATABASE postgres SET parallel_setup_cost = 1000;

-- Optimize work memory for complex queries
ALTER DATABASE postgres SET work_mem = '256MB';

-- Enable query plan caching
ALTER DATABASE postgres SET plan_cache_mode = 'auto';

-- 8. Create refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_marketplace_analytics()
RETURNS void AS $
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY marketplace_analytics_daily;
END;
$ language 'plpgsql';

-- 9. Add comments for documentation
COMMENT ON VIEW marketplace_product_listings IS 'Optimized view for marketplace product listings with aggregated vendor data';
COMMENT ON VIEW vendor_marketplace_products IS 'Optimized view for vendor product management with stock status';
COMMENT ON MATERIALIZED VIEW marketplace_analytics_daily IS 'Daily aggregated analytics data for marketplace performance';
COMMENT ON FUNCTION get_marketplace_products_optimized IS 'Optimized function for marketplace product search and filtering';
COMMENT ON FUNCTION get_vendor_marketplace_products_optimized IS 'Optimized function for vendor product management queries';
COMMENT ON FUNCTION refresh_marketplace_analytics IS 'Function to refresh materialized analytics views';

-- 10. Create monitoring queries for performance tracking
CREATE OR REPLACE VIEW slow_queries_monitoring AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE query LIKE '%market_%' 
ORDER BY mean_time DESC;

-- Enable pg_stat_statements if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;