-- Platform P&L and Commission Analytics
-- Calculates revenue, commissions, and sales using actual commission rules

-- 1) Summary for a date range
CREATE OR REPLACE FUNCTION get_platform_pnl_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_commission NUMERIC,
  total_orders BIGINT,
  avg_order_value NUMERIC
) AS $$
  WITH delivered_base AS (
    SELECT 
      oi.id AS order_item_id,
      oi.order_id,
      oi.vendor_id,
      oi.line_total::NUMERIC AS line_total,
      o.created_at::DATE AS order_date,
      vp.category_id,
      vp.quality_type_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN vendor_products vp ON vp.id = oi.vendor_product_id
    WHERE o.order_status = 'delivered'
      AND o.created_at >= p_start_date
      AND o.created_at < (p_end_date + INTERVAL '1 day')
  ),
  di_with_rate AS (
    SELECT 
      db.*, 
      COALESCE(vendor_rate.commission_rate, quality_rule.commission_percentage, category_rule.commission_percentage, 15.0) AS commission_rate
    FROM delivered_base db
    LEFT JOIN LATERAL (
      SELECT vc.commission_rate
      FROM vendor_commissions vc
      WHERE vc.vendor_id = db.vendor_id
        AND vc.quality_id = db.quality_type_id
        AND vc.is_active = TRUE
      ORDER BY vc.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS vendor_rate ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr.commission_percentage
      FROM commission_rules cr
      WHERE cr.category_id = db.category_id
        AND cr.quality_id = db.quality_type_id
        AND cr.is_active = TRUE
      ORDER BY cr.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS quality_rule ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr2.commission_percentage
      FROM commission_rules cr2
      WHERE cr2.category_id = db.category_id
        AND cr2.quality_id IS NULL
        AND cr2.is_active = TRUE
      ORDER BY cr2.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS category_rule ON TRUE
  )
  SELECT
    COALESCE(SUM(line_total), 0) AS total_revenue,
    COALESCE(SUM(line_total * (commission_rate / 100.0)), 0) AS total_commission,
    COUNT(DISTINCT order_id) AS total_orders,
    CASE WHEN COUNT(DISTINCT order_id) > 0 
      THEN COALESCE(SUM(line_total), 0) / COUNT(DISTINCT order_id)
      ELSE 0 END AS avg_order_value
  FROM di_with_rate;
$$ LANGUAGE SQL STABLE;

-- 2) Daily breakdown between dates (inclusive)
CREATE OR REPLACE FUNCTION get_platform_pnl_daily(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date_day DATE,
  daily_revenue NUMERIC,
  daily_commission NUMERIC,
  orders_count BIGINT,
  avg_order_value NUMERIC
) AS $$
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, INTERVAL '1 day')::DATE AS date_day
  ),
  delivered_base AS (
    SELECT 
      oi.id AS order_item_id,
      oi.order_id,
      oi.vendor_id,
      oi.line_total::NUMERIC AS line_total,
      o.created_at::DATE AS order_date,
      vp.category_id,
      vp.quality_type_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN vendor_products vp ON vp.id = oi.vendor_product_id
    WHERE o.order_status = 'delivered'
      AND o.created_at >= p_start_date
      AND o.created_at < (p_end_date + INTERVAL '1 day')
  ),
  di_with_rate AS (
    SELECT 
      db.*, 
      COALESCE(vendor_rate.commission_rate, quality_rule.commission_percentage, category_rule.commission_percentage, 15.0) AS commission_rate
    FROM delivered_base db
    LEFT JOIN LATERAL (
      SELECT vc.commission_rate
      FROM vendor_commissions vc
      WHERE vc.vendor_id = db.vendor_id
        AND vc.quality_id = db.quality_type_id
        AND vc.is_active = TRUE
      ORDER BY vc.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS vendor_rate ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr.commission_percentage
      FROM commission_rules cr
      WHERE cr.category_id = db.category_id
        AND cr.quality_id = db.quality_type_id
        AND cr.is_active = TRUE
      ORDER BY cr.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS quality_rule ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr2.commission_percentage
      FROM commission_rules cr2
      WHERE cr2.category_id = db.category_id
        AND cr2.quality_id IS NULL
        AND cr2.is_active = TRUE
      ORDER BY cr2.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS category_rule ON TRUE
  ),
  daily_agg AS (
    SELECT 
      order_date AS date_day,
      SUM(line_total) AS daily_revenue,
      SUM(line_total * (commission_rate / 100.0)) AS daily_commission,
      COUNT(DISTINCT order_id) AS orders_count
    FROM di_with_rate
    GROUP BY order_date
  )
  SELECT 
    ds.date_day,
    COALESCE(da.daily_revenue, 0) AS daily_revenue,
    COALESCE(da.daily_commission, 0) AS daily_commission,
    COALESCE(da.orders_count, 0) AS orders_count,
    CASE WHEN COALESCE(da.orders_count, 0) > 0 
      THEN COALESCE(da.daily_revenue, 0) / da.orders_count
      ELSE 0 END AS avg_order_value
  FROM date_series ds
  LEFT JOIN daily_agg da ON ds.date_day = da.date_day
  ORDER BY ds.date_day;
$$ LANGUAGE SQL STABLE;

-- 3) Commission by category in date range
CREATE OR REPLACE FUNCTION get_platform_commission_by_category(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  commission_amount NUMERIC
) AS $$
  WITH delivered_base AS (
    SELECT 
      oi.id AS order_item_id,
      oi.order_id,
      oi.vendor_id,
      oi.line_total::NUMERIC AS line_total,
      o.created_at::DATE AS order_date,
      vp.category_id,
      vp.quality_type_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN vendor_products vp ON vp.id = oi.vendor_product_id
    WHERE o.order_status = 'delivered'
      AND o.created_at >= p_start_date
      AND o.created_at < (p_end_date + INTERVAL '1 day')
  ),
  di_with_rate AS (
    SELECT 
      db.*, 
      COALESCE(vendor_rate.commission_rate, quality_rule.commission_percentage, category_rule.commission_percentage, 15.0) AS commission_rate
    FROM delivered_base db
    LEFT JOIN LATERAL (
      SELECT vc.commission_rate
      FROM vendor_commissions vc
      WHERE vc.vendor_id = db.vendor_id
        AND vc.quality_id = db.quality_type_id
        AND vc.is_active = TRUE
      ORDER BY vc.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS vendor_rate ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr.commission_percentage
      FROM commission_rules cr
      WHERE cr.category_id = db.category_id
        AND cr.quality_id = db.quality_type_id
        AND cr.is_active = TRUE
      ORDER BY cr.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS quality_rule ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr2.commission_percentage
      FROM commission_rules cr2
      WHERE cr2.category_id = db.category_id
        AND cr2.quality_id IS NULL
        AND cr2.is_active = TRUE
      ORDER BY cr2.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS category_rule ON TRUE
  )
  SELECT 
    c.id AS category_id,
    c.name AS category_name,
    COALESCE(SUM(dwr.line_total * (dwr.commission_rate / 100.0)), 0) AS commission_amount
  FROM di_with_rate dwr
  LEFT JOIN categories c ON c.id = dwr.category_id
  GROUP BY c.id, c.name
  ORDER BY commission_amount DESC NULLS LAST;
$$ LANGUAGE SQL STABLE;

-- 4) Vendor performance (revenue and commission) in date range
CREATE OR REPLACE FUNCTION get_platform_vendor_performance(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  vendor_id UUID,
  vendor_name TEXT,
  total_revenue NUMERIC,
  total_commission NUMERIC,
  total_orders BIGINT
) AS $$
  WITH delivered_base AS (
    SELECT 
      oi.id AS order_item_id,
      oi.order_id,
      oi.vendor_id,
      oi.line_total::NUMERIC AS line_total,
      o.created_at::DATE AS order_date,
      vp.category_id,
      vp.quality_type_id
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN vendor_products vp ON vp.id = oi.vendor_product_id
    WHERE o.order_status = 'delivered'
      AND o.created_at >= p_start_date
      AND o.created_at < (p_end_date + INTERVAL '1 day')
  ),
  di_with_rate AS (
    SELECT 
      db.*, 
      COALESCE(vendor_rate.commission_rate, quality_rule.commission_percentage, category_rule.commission_percentage, 15.0) AS commission_rate
    FROM delivered_base db
    LEFT JOIN LATERAL (
      SELECT vc.commission_rate
      FROM vendor_commissions vc
      WHERE vc.vendor_id = db.vendor_id
        AND vc.quality_id = db.quality_type_id
        AND vc.is_active = TRUE
      ORDER BY vc.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS vendor_rate ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr.commission_percentage
      FROM commission_rules cr
      WHERE cr.category_id = db.category_id
        AND cr.quality_id = db.quality_type_id
        AND cr.is_active = TRUE
      ORDER BY cr.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS quality_rule ON TRUE
    LEFT JOIN LATERAL (
      SELECT cr2.commission_percentage
      FROM commission_rules cr2
      WHERE cr2.category_id = db.category_id
        AND cr2.quality_id IS NULL
        AND cr2.is_active = TRUE
      ORDER BY cr2.effective_from DESC NULLS LAST
      LIMIT 1
    ) AS category_rule ON TRUE
  )
  SELECT 
    v.id AS vendor_id,
    v.business_name AS vendor_name,
    COALESCE(SUM(dwr.line_total), 0) AS total_revenue,
    COALESCE(SUM(dwr.line_total * (dwr.commission_rate / 100.0)), 0) AS total_commission,
    COUNT(DISTINCT dwr.order_id) AS total_orders
  FROM di_with_rate dwr
  LEFT JOIN vendors v ON v.id = dwr.vendor_id
  GROUP BY v.id, v.business_name
  ORDER BY total_revenue DESC NULLS LAST;
$$ LANGUAGE SQL STABLE; 