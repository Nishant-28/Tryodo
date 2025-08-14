-- Marketplace Analytics Migration
-- This migration adds comprehensive analytics functions for admin monitoring

-- 1. Enhanced marketplace analytics function
CREATE OR REPLACE FUNCTION get_comprehensive_marketplace_analytics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    -- Product Analytics
    total_market_products BIGINT,
    active_market_products BIGINT,
    total_vendor_products BIGINT,
    active_vendor_products BIGINT,
    products_in_stock BIGINT,
    products_out_of_stock BIGINT,
    products_low_stock BIGINT,
    
    -- Vendor Analytics
    total_vendors BIGINT,
    active_vendors BIGINT,
    vendors_with_marketplace_products BIGINT,
    avg_products_per_vendor NUMERIC,
    
    -- Request Analytics
    total_requests BIGINT,
    pending_requests BIGINT,
    approved_requests BIGINT,
    rejected_requests BIGINT,
    approval_rate NUMERIC,
    
    -- Sales Analytics
    total_marketplace_orders BIGINT,
    total_marketplace_revenue NUMERIC,
    avg_order_value NUMERIC,
    
    -- Stock Analytics
    total_stock_units BIGINT,
    total_stock_value NUMERIC,
    avg_stock_per_product NUMERIC,
    
    -- Category Analytics
    total_categories BIGINT,
    categories_with_products BIGINT,
    
    -- Brand Analytics
    total_brands BIGINT,
    brands_with_products BIGINT
) AS $
BEGIN
    RETURN QUERY
    WITH product_stats AS (
        SELECT 
            COUNT(*) as total_market_products,
            COUNT(*) FILTER (WHERE is_active = TRUE) as active_market_products
        FROM market_products
    ),
    vendor_product_stats AS (
        SELECT 
            COUNT(*) as total_vendor_products,
            COUNT(*) FILTER (WHERE is_active = TRUE) as active_vendor_products,
            COUNT(*) FILTER (WHERE is_active = TRUE AND is_in_stock = TRUE) as products_in_stock,
            COUNT(*) FILTER (WHERE is_active = TRUE AND is_in_stock = FALSE) as products_out_of_stock,
            COUNT(*) FILTER (WHERE is_active = TRUE AND is_in_stock = TRUE AND stock_quantity <= low_stock_threshold) as products_low_stock,
            SUM(stock_quantity) as total_stock_units,
            AVG(stock_quantity) as avg_stock_per_product
        FROM market_vendor_products
    ),
    vendor_stats AS (
        SELECT 
            COUNT(DISTINCT v.id) as total_vendors,
            COUNT(DISTINCT v.id) FILTER (WHERE v.is_active = TRUE) as active_vendors,
            COUNT(DISTINCT mvp.vendor_id) as vendors_with_marketplace_products,
            CASE 
                WHEN COUNT(DISTINCT mvp.vendor_id) > 0 
                THEN COUNT(mvp.id)::NUMERIC / COUNT(DISTINCT mvp.vendor_id)
                ELSE 0 
            END as avg_products_per_vendor
        FROM vendors v
        LEFT JOIN market_vendor_products mvp ON v.id = mvp.vendor_id AND mvp.is_active = TRUE
    ),
    request_stats AS (
        SELECT 
            COUNT(*) as total_requests,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
            COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
            COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
            CASE 
                WHEN COUNT(*) > 0 
                THEN (COUNT(*) FILTER (WHERE status = 'approved'))::NUMERIC / COUNT(*) * 100
                ELSE 0 
            END as approval_rate
        FROM market_vendor_product_requests
        WHERE created_at >= p_start_date AND created_at <= p_end_date + INTERVAL '1 day'
    ),
    sales_stats AS (
        SELECT 
            COUNT(DISTINCT o.id) as total_marketplace_orders,
            COALESCE(SUM(oi.line_total), 0) as total_marketplace_revenue,
            CASE 
                WHEN COUNT(DISTINCT o.id) > 0 
                THEN COALESCE(SUM(oi.line_total), 0) / COUNT(DISTINCT o.id)
                ELSE 0 
            END as avg_order_value
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.product_type = 'marketplace'
        AND o.created_at >= p_start_date 
        AND o.created_at <= p_end_date + INTERVAL '1 day'
        AND o.order_status != 'cancelled'
    ),
    category_stats AS (
        SELECT 
            COUNT(*) as total_categories,
            COUNT(DISTINCT mp.category_id) as categories_with_products
        FROM market_categories mc
        LEFT JOIN market_products mp ON mc.id = mp.category_id AND mp.is_active = TRUE
    ),
    brand_stats AS (
        SELECT 
            COUNT(*) as total_brands,
            COUNT(DISTINCT mp.brand_id) as brands_with_products
        FROM market_brands mb
        LEFT JOIN market_products mp ON mb.id = mp.brand_id AND mp.is_active = TRUE
    )
    SELECT 
        ps.total_market_products,
        ps.active_market_products,
        vps.total_vendor_products,
        vps.active_vendor_products,
        vps.products_in_stock,
        vps.products_out_of_stock,
        vps.products_low_stock,
        vs.total_vendors,
        vs.active_vendors,
        vs.vendors_with_marketplace_products,
        vs.avg_products_per_vendor,
        rs.total_requests,
        rs.pending_requests,
        rs.approved_requests,
        rs.rejected_requests,
        rs.approval_rate,
        ss.total_marketplace_orders,
        ss.total_marketplace_revenue,
        ss.avg_order_value,
        vps.total_stock_units,
        0::NUMERIC as total_stock_value, -- Would need pricing data to calculate
        vps.avg_stock_per_product,
        cs.total_categories,
        cs.categories_with_products,
        bs.total_brands,
        bs.brands_with_products
    FROM product_stats ps
    CROSS JOIN vendor_product_stats vps
    CROSS JOIN vendor_stats vs
    CROSS JOIN request_stats rs
    CROSS JOIN sales_stats ss
    CROSS JOIN category_stats cs
    CROSS JOIN brand_stats bs;
END;
$ language 'plpgsql';

-- 2. Function to get top performing products
CREATE OR REPLACE FUNCTION get_top_marketplace_products(
    p_limit INTEGER DEFAULT 10,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    category_name TEXT,
    brand_name TEXT,
    total_orders BIGINT,
    total_revenue NUMERIC,
    total_quantity_sold BIGINT,
    avg_price NUMERIC,
    vendor_count BIGINT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        mp.id,
        mp.name,
        mc.name,
        mb.name,
        COUNT(DISTINCT oi.order_id),
        SUM(oi.line_total),
        SUM(oi.quantity),
        AVG(oi.unit_price),
        COUNT(DISTINCT mvp.vendor_id)
    FROM market_products mp
    JOIN market_categories mc ON mp.category_id = mc.id
    JOIN market_brands mb ON mp.brand_id = mb.id
    JOIN market_vendor_products mvp ON mp.id = mvp.market_product_id
    JOIN order_items oi ON mvp.id = oi.market_vendor_product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_type = 'marketplace'
    AND o.created_at >= p_start_date 
    AND o.created_at <= p_end_date + INTERVAL '1 day'
    AND o.order_status != 'cancelled'
    GROUP BY mp.id, mp.name, mc.name, mb.name
    ORDER BY SUM(oi.line_total) DESC
    LIMIT p_limit;
END;
$ language 'plpgsql';

-- 3. Function to get vendor performance analytics
CREATE OR REPLACE FUNCTION get_vendor_performance_analytics(
    p_limit INTEGER DEFAULT 10,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    vendor_id UUID,
    vendor_name TEXT,
    total_products BIGINT,
    active_products BIGINT,
    products_in_stock BIGINT,
    total_orders BIGINT,
    total_revenue NUMERIC,
    avg_order_value NUMERIC,
    approval_rate NUMERIC,
    stock_health_percentage NUMERIC
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.business_name,
        COUNT(mvp.id),
        COUNT(mvp.id) FILTER (WHERE mvp.is_active = TRUE),
        COUNT(mvp.id) FILTER (WHERE mvp.is_active = TRUE AND mvp.is_in_stock = TRUE),
        COUNT(DISTINCT oi.order_id),
        COALESCE(SUM(oi.line_total), 0),
        CASE 
            WHEN COUNT(DISTINCT oi.order_id) > 0 
            THEN COALESCE(SUM(oi.line_total), 0) / COUNT(DISTINCT oi.order_id)
            ELSE 0 
        END,
        CASE 
            WHEN COUNT(mvpr.id) > 0 
            THEN (COUNT(mvpr.id) FILTER (WHERE mvpr.status = 'approved'))::NUMERIC / COUNT(mvpr.id) * 100
            ELSE 0 
        END,
        CASE 
            WHEN COUNT(mvp.id) FILTER (WHERE mvp.is_active = TRUE) > 0 
            THEN (COUNT(mvp.id) FILTER (WHERE mvp.is_active = TRUE AND mvp.is_in_stock = TRUE))::NUMERIC / 
                 COUNT(mvp.id) FILTER (WHERE mvp.is_active = TRUE) * 100
            ELSE 0 
        END
    FROM vendors v
    LEFT JOIN market_vendor_products mvp ON v.id = mvp.vendor_id
    LEFT JOIN market_vendor_product_requests mvpr ON v.id = mvpr.vendor_id
    LEFT JOIN order_items oi ON mvp.id = oi.market_vendor_product_id 
        AND oi.product_type = 'marketplace'
    LEFT JOIN orders o ON oi.order_id = o.id 
        AND o.created_at >= p_start_date 
        AND o.created_at <= p_end_date + INTERVAL '1 day'
        AND o.order_status != 'cancelled'
    WHERE v.is_active = TRUE
    GROUP BY v.id, v.business_name
    HAVING COUNT(mvp.id) > 0
    ORDER BY COALESCE(SUM(oi.line_total), 0) DESC
    LIMIT p_limit;
END;
$ language 'plpgsql';

-- 4. Function to get daily sales trends
CREATE OR REPLACE FUNCTION get_marketplace_daily_trends(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date_day DATE,
    total_orders BIGINT,
    total_revenue NUMERIC,
    new_vendor_requests BIGINT,
    approved_requests BIGINT,
    new_products BIGINT
) AS $
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
            CURRENT_DATE,
            INTERVAL '1 day'
        )::DATE as date_day
    ),
    daily_orders AS (
        SELECT 
            o.created_at::DATE as order_date,
            COUNT(DISTINCT o.id) as total_orders,
            SUM(oi.line_total) as total_revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.product_type = 'marketplace'
        AND o.order_status != 'cancelled'
        AND o.created_at >= CURRENT_DATE - (p_days - 1) * INTERVAL '1 day'
        GROUP BY o.created_at::DATE
    ),
    daily_requests AS (
        SELECT 
            created_at::DATE as request_date,
            COUNT(*) as new_requests
        FROM market_vendor_product_requests
        WHERE created_at >= CURRENT_DATE - (p_days - 1) * INTERVAL '1 day'
        GROUP BY created_at::DATE
    ),
    daily_approvals AS (
        SELECT 
            reviewed_at::DATE as approval_date,
            COUNT(*) as approved_requests
        FROM market_vendor_product_requests
        WHERE status = 'approved'
        AND reviewed_at >= CURRENT_DATE - (p_days - 1) * INTERVAL '1 day'
        GROUP BY reviewed_at::DATE
    ),
    daily_products AS (
        SELECT 
            created_at::DATE as product_date,
            COUNT(*) as new_products
        FROM market_vendor_products
        WHERE created_at >= CURRENT_DATE - (p_days - 1) * INTERVAL '1 day'
        GROUP BY created_at::DATE
    )
    SELECT 
        ds.date_day,
        COALESCE(do.total_orders, 0),
        COALESCE(do.total_revenue, 0),
        COALESCE(dr.new_requests, 0),
        COALESCE(da.approved_requests, 0),
        COALESCE(dp.new_products, 0)
    FROM date_series ds
    LEFT JOIN daily_orders do ON ds.date_day = do.order_date
    LEFT JOIN daily_requests dr ON ds.date_day = dr.request_date
    LEFT JOIN daily_approvals da ON ds.date_day = da.approval_date
    LEFT JOIN daily_products dp ON ds.date_day = dp.product_date
    ORDER BY ds.date_day;
END;
$ language 'plpgsql';

-- 5. Function to get category performance
CREATE OR REPLACE FUNCTION get_category_performance(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    total_products BIGINT,
    active_vendor_products BIGINT,
    total_orders BIGINT,
    total_revenue NUMERIC,
    avg_price NUMERIC,
    vendor_count BIGINT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.name,
        COUNT(DISTINCT mp.id),
        COUNT(DISTINCT mvp.id) FILTER (WHERE mvp.is_active = TRUE),
        COUNT(DISTINCT oi.order_id),
        COALESCE(SUM(oi.line_total), 0),
        CASE 
            WHEN COUNT(oi.id) > 0 
            THEN AVG(oi.unit_price)
            ELSE 0 
        END,
        COUNT(DISTINCT mvp.vendor_id)
    FROM market_categories mc
    LEFT JOIN market_products mp ON mc.id = mp.category_id
    LEFT JOIN market_vendor_products mvp ON mp.id = mvp.market_product_id
    LEFT JOIN order_items oi ON mvp.id = oi.market_vendor_product_id 
        AND oi.product_type = 'marketplace'
    LEFT JOIN orders o ON oi.order_id = o.id 
        AND o.created_at >= p_start_date 
        AND o.created_at <= p_end_date + INTERVAL '1 day'
        AND o.order_status != 'cancelled'
    WHERE mc.is_active = TRUE
    GROUP BY mc.id, mc.name
    ORDER BY COALESCE(SUM(oi.line_total), 0) DESC;
END;
$ language 'plpgsql';

-- 6. Function to get low stock alerts for admin monitoring
CREATE OR REPLACE FUNCTION get_admin_stock_alerts()
RETURNS TABLE (
    vendor_id UUID,
    vendor_name TEXT,
    product_id UUID,
    product_name TEXT,
    current_stock INTEGER,
    threshold INTEGER,
    is_out_of_stock BOOLEAN,
    days_since_last_update INTEGER,
    category_name TEXT,
    brand_name TEXT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.business_name,
        mvp.id,
        mp.name,
        mvp.stock_quantity,
        mvp.low_stock_threshold,
        NOT mvp.is_in_stock,
        EXTRACT(DAY FROM NOW() - mvp.last_stock_update)::INTEGER,
        mc.name,
        mb.name
    FROM market_vendor_products mvp
    JOIN vendors v ON mvp.vendor_id = v.id
    JOIN market_products mp ON mvp.market_product_id = mp.id
    JOIN market_categories mc ON mp.category_id = mc.id
    JOIN market_brands mb ON mp.brand_id = mb.id
    WHERE mvp.is_active = TRUE
    AND v.is_active = TRUE
    AND (mvp.stock_quantity <= mvp.low_stock_threshold OR NOT mvp.is_in_stock)
    ORDER BY mvp.stock_quantity ASC, mvp.last_stock_update DESC;
END;
$ language 'plpgsql';

-- 7. Create analytics views for easier querying
CREATE OR REPLACE VIEW marketplace_overview AS
SELECT * FROM get_comprehensive_marketplace_analytics();

-- 8. Add RLS policies for analytics functions (admin only)
-- Note: These functions should only be accessible by admin users
-- The RLS will be enforced at the application level

-- Add comments for documentation
COMMENT ON FUNCTION get_comprehensive_marketplace_analytics(DATE, DATE) IS 'Returns comprehensive marketplace analytics for admin dashboard';
COMMENT ON FUNCTION get_top_marketplace_products(INTEGER, DATE, DATE) IS 'Returns top performing marketplace products by revenue';
COMMENT ON FUNCTION get_vendor_performance_analytics(INTEGER, DATE, DATE) IS 'Returns vendor performance metrics for admin monitoring';
COMMENT ON FUNCTION get_marketplace_daily_trends(INTEGER) IS 'Returns daily trends for marketplace activity';
COMMENT ON FUNCTION get_category_performance(DATE, DATE) IS 'Returns performance metrics by category';
COMMENT ON FUNCTION get_admin_stock_alerts() IS 'Returns all low stock and out of stock products for admin monitoring';