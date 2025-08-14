-- Stock Management Enhancements Migration
-- This migration adds enhanced stock management features for marketplace products

-- 1. Create stock history table for tracking stock changes
CREATE TABLE IF NOT EXISTS public.market_stock_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_vendor_product_id UUID NOT NULL REFERENCES market_vendor_products(id) ON DELETE CASCADE,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('manual_update', 'order_deduction', 'order_cancellation', 'bulk_update', 'threshold_update')),
  change_reason TEXT,
  changed_by UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id), -- For order-related changes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for stock history
CREATE INDEX IF NOT EXISTS idx_stock_history_product_id ON public.market_stock_history(market_vendor_product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created_at ON public.market_stock_history(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_history_change_type ON public.market_stock_history(change_type);
CREATE INDEX IF NOT EXISTS idx_stock_history_order_id ON public.market_stock_history(order_id);

-- 2. Enhanced stock update function with history tracking
CREATE OR REPLACE FUNCTION update_market_product_stock_with_history()
RETURNS TRIGGER AS $
BEGIN
    -- Only track if stock_quantity actually changed
    IF OLD.stock_quantity != NEW.stock_quantity THEN
        -- Insert into stock history
        INSERT INTO market_stock_history (
            market_vendor_product_id,
            previous_quantity,
            new_quantity,
            change_type,
            change_reason,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.stock_quantity,
            NEW.stock_quantity,
            'manual_update',
            'Stock quantity updated',
            auth.uid()
        );
    END IF;

    -- Update is_in_stock based on stock_quantity
    NEW.is_in_stock = CASE WHEN NEW.stock_quantity > 0 THEN TRUE ELSE FALSE END;
    NEW.last_stock_update = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Replace the existing stock status trigger with the enhanced version
DROP TRIGGER IF EXISTS trigger_market_vendor_products_stock_status ON public.market_vendor_products;
CREATE TRIGGER trigger_market_vendor_products_stock_status 
BEFORE UPDATE OF stock_quantity ON public.market_vendor_products 
FOR EACH ROW EXECUTE FUNCTION update_market_product_stock_with_history();

-- 3. Enhanced order stock deduction function with history
CREATE OR REPLACE FUNCTION update_marketplace_stock_on_order_with_history()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.product_type = 'marketplace' AND NEW.market_vendor_product_id IS NOT NULL THEN
        -- Get current stock
        DECLARE
            current_stock INTEGER;
            product_name TEXT;
        BEGIN
            SELECT stock_quantity INTO current_stock 
            FROM market_vendor_products 
            WHERE id = NEW.market_vendor_product_id;

            -- Update stock
            UPDATE market_vendor_products 
            SET stock_quantity = stock_quantity - NEW.quantity,
                is_in_stock = CASE WHEN stock_quantity - NEW.quantity <= 0 THEN FALSE ELSE TRUE END,
                last_stock_update = NOW()
            WHERE id = NEW.market_vendor_product_id;

            -- Insert stock history record
            INSERT INTO market_stock_history (
                market_vendor_product_id,
                previous_quantity,
                new_quantity,
                change_type,
                change_reason,
                order_id
            ) VALUES (
                NEW.market_vendor_product_id,
                current_stock,
                current_stock - NEW.quantity,
                'order_deduction',
                'Stock deducted for order #' || (SELECT order_number FROM orders WHERE id = NEW.order_id),
                NEW.order_id
            );
        END;
    END IF;
    RETURN NEW;
END;
$ language 'plpgsql';

-- Replace the existing order stock deduction trigger
DROP TRIGGER IF EXISTS trigger_marketplace_stock_deduction ON public.order_items;
CREATE TRIGGER trigger_marketplace_stock_deduction 
AFTER INSERT ON public.order_items 
FOR EACH ROW EXECUTE FUNCTION update_marketplace_stock_on_order_with_history();

-- 4. Function to handle stock restoration on order cancellation
CREATE OR REPLACE FUNCTION restore_marketplace_stock_on_cancellation()
RETURNS TRIGGER AS $
BEGIN
    -- Only process if order status changed to cancelled
    IF OLD.order_status != 'cancelled' AND NEW.order_status = 'cancelled' THEN
        -- Restore stock for all marketplace items in this order
        UPDATE market_vendor_products 
        SET stock_quantity = stock_quantity + oi.quantity,
            is_in_stock = TRUE,
            last_stock_update = NOW()
        FROM order_items oi
        WHERE oi.order_id = NEW.id 
        AND oi.product_type = 'marketplace' 
        AND oi.market_vendor_product_id = market_vendor_products.id;

        -- Insert stock history records for restoration
        INSERT INTO market_stock_history (
            market_vendor_product_id,
            previous_quantity,
            new_quantity,
            change_type,
            change_reason,
            order_id
        )
        SELECT 
            oi.market_vendor_product_id,
            mvp.stock_quantity - oi.quantity,
            mvp.stock_quantity,
            'order_cancellation',
            'Stock restored due to order cancellation #' || NEW.order_number,
            NEW.id
        FROM order_items oi
        JOIN market_vendor_products mvp ON oi.market_vendor_product_id = mvp.id
        WHERE oi.order_id = NEW.id 
        AND oi.product_type = 'marketplace';
    END IF;
    
    RETURN NEW;
END;
$ language 'plpgsql';

-- Create trigger for order cancellation stock restoration
CREATE TRIGGER trigger_restore_stock_on_cancellation 
AFTER UPDATE OF order_status ON public.orders 
FOR EACH ROW EXECUTE FUNCTION restore_marketplace_stock_on_cancellation();

-- 5. Function to get low stock products for a vendor
CREATE OR REPLACE FUNCTION get_vendor_low_stock_products(p_vendor_id UUID)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    current_stock INTEGER,
    threshold INTEGER,
    is_out_of_stock BOOLEAN,
    days_since_last_update INTEGER
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        mvp.id,
        mp.name,
        mvp.stock_quantity,
        mvp.low_stock_threshold,
        NOT mvp.is_in_stock,
        EXTRACT(DAY FROM NOW() - mvp.last_stock_update)::INTEGER
    FROM market_vendor_products mvp
    JOIN market_products mp ON mvp.market_product_id = mp.id
    WHERE mvp.vendor_id = p_vendor_id
    AND mvp.is_active = TRUE
    AND (mvp.stock_quantity <= mvp.low_stock_threshold OR NOT mvp.is_in_stock)
    ORDER BY mvp.stock_quantity ASC, mvp.last_stock_update DESC;
END;
$ language 'plpgsql';

-- 6. Function to validate and reserve stock atomically (with row-level locking)
CREATE OR REPLACE FUNCTION validate_and_reserve_marketplace_stock(
    p_items JSONB, -- Array of {market_vendor_product_id, quantity}
    p_order_id UUID DEFAULT NULL -- Optional order ID for tracking
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    requested_quantity INTEGER,
    available_quantity INTEGER,
    is_available BOOLEAN,
    error_message TEXT,
    reserved BOOLEAN
) AS $
DECLARE
    item JSONB;
    mvp_record RECORD;
    reservation_success BOOLEAN := TRUE;
BEGIN
    -- Process each item with row-level locking to prevent concurrent modifications
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Lock the specific product row for update to prevent concurrent stock modifications
        SELECT mvp.id, mvp.stock_quantity, mvp.is_active, mvp.is_in_stock, 
               mvp.min_order_quantity, mvp.max_order_quantity, mp.name
        INTO mvp_record
        FROM market_vendor_products mvp
        JOIN market_products mp ON mvp.market_product_id = mp.id
        WHERE mvp.id = (item->>'market_vendor_product_id')::UUID
        FOR UPDATE; -- This creates a row-level lock
        
        -- Check if product exists
        IF NOT FOUND THEN
            RETURN QUERY SELECT 
                (item->>'market_vendor_product_id')::UUID,
                'Unknown Product'::TEXT,
                (item->>'quantity')::INTEGER,
                0,
                FALSE,
                'Product not found'::TEXT,
                FALSE;
            reservation_success := FALSE;
            CONTINUE;
        END IF;
        
        -- Validate stock availability and business rules
        DECLARE
            requested_qty INTEGER := (item->>'quantity')::INTEGER;
            is_valid BOOLEAN := TRUE;
            error_msg TEXT := NULL;
        BEGIN
            -- Check if product is active
            IF NOT mvp_record.is_active THEN
                is_valid := FALSE;
                error_msg := 'Product is not active';
            -- Check if product is in stock
            ELSIF NOT mvp_record.is_in_stock THEN
                is_valid := FALSE;
                error_msg := 'Product is out of stock';
            -- Check if sufficient stock is available
            ELSIF mvp_record.stock_quantity < requested_qty THEN
                is_valid := FALSE;
                error_msg := 'Insufficient stock available (only ' || mvp_record.stock_quantity || ' remaining)';
            -- Check minimum order quantity
            ELSIF requested_qty < COALESCE(mvp_record.min_order_quantity, 1) THEN
                is_valid := FALSE;
                error_msg := 'Minimum order quantity is ' || COALESCE(mvp_record.min_order_quantity, 1);
            -- Check maximum order quantity
            ELSIF mvp_record.max_order_quantity IS NOT NULL AND requested_qty > mvp_record.max_order_quantity THEN
                is_valid := FALSE;
                error_msg := 'Maximum order quantity is ' || mvp_record.max_order_quantity;
            END IF;
            
            -- If validation passes and order_id is provided, reserve the stock
            IF is_valid AND p_order_id IS NOT NULL THEN
                -- Update stock quantity atomically
                UPDATE market_vendor_products 
                SET stock_quantity = stock_quantity - requested_qty,
                    is_in_stock = CASE WHEN stock_quantity - requested_qty <= 0 THEN FALSE ELSE TRUE END,
                    last_stock_update = NOW()
                WHERE id = mvp_record.id;
                
                -- Log the stock change
                INSERT INTO market_stock_history (
                    market_vendor_product_id,
                    previous_quantity,
                    new_quantity,
                    change_type,
                    change_reason,
                    order_id
                ) VALUES (
                    mvp_record.id,
                    mvp_record.stock_quantity,
                    mvp_record.stock_quantity - requested_qty,
                    'order_reservation',
                    'Stock reserved for order',
                    p_order_id
                );
            END IF;
            
            -- Return the validation result
            RETURN QUERY SELECT 
                (item->>'market_vendor_product_id')::UUID,
                mvp_record.name,
                requested_qty,
                mvp_record.stock_quantity,
                is_valid,
                error_msg,
                (is_valid AND p_order_id IS NOT NULL);
                
            IF NOT is_valid THEN
                reservation_success := FALSE;
            END IF;
        END;
    END LOOP;
    
    -- If any reservation failed and we were reserving stock, rollback all changes
    IF NOT reservation_success AND p_order_id IS NOT NULL THEN
        RAISE EXCEPTION 'Stock reservation failed for order %', p_order_id;
    END IF;
END;
$ language 'plpgsql';

-- Legacy function for validation only (without reservation)
CREATE OR REPLACE FUNCTION validate_marketplace_stock(
    p_items JSONB -- Array of {market_vendor_product_id, quantity}
)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    requested_quantity INTEGER,
    available_quantity INTEGER,
    is_available BOOLEAN,
    error_message TEXT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        vr.product_id,
        vr.product_name,
        vr.requested_quantity,
        vr.available_quantity,
        vr.is_available,
        vr.error_message
    FROM validate_and_reserve_marketplace_stock(p_items, NULL) vr;
END;
$ language 'plpgsql';

-- 7. Function to get stock analytics for admin dashboard
CREATE OR REPLACE FUNCTION get_marketplace_stock_analytics()
RETURNS TABLE (
    total_products BIGINT,
    total_vendors BIGINT,
    products_in_stock BIGINT,
    products_out_of_stock BIGINT,
    products_low_stock BIGINT,
    total_stock_value BIGINT,
    avg_stock_per_product NUMERIC
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT vendor_id) as total_vendors,
        COUNT(*) FILTER (WHERE is_in_stock = TRUE) as products_in_stock,
        COUNT(*) FILTER (WHERE is_in_stock = FALSE) as products_out_of_stock,
        COUNT(*) FILTER (WHERE is_in_stock = TRUE AND stock_quantity <= low_stock_threshold) as products_low_stock,
        SUM(stock_quantity) as total_stock_value,
        AVG(stock_quantity) as avg_stock_per_product
    FROM market_vendor_products
    WHERE is_active = TRUE;
END;
$ language 'plpgsql';

-- 8. Create notification triggers for low stock alerts
CREATE TABLE IF NOT EXISTS public.stock_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    market_vendor_product_id UUID NOT NULL REFERENCES market_vendor_products(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('low_stock', 'out_of_stock', 'stock_restored')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_stock_notifications_vendor_id ON public.stock_notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_created_at ON public.stock_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_is_read ON public.stock_notifications(is_read);

-- Function to create stock notifications
CREATE OR REPLACE FUNCTION create_stock_notification()
RETURNS TRIGGER AS $
BEGIN
    -- Check if stock went from above threshold to below threshold (low stock alert)
    IF OLD.stock_quantity > OLD.low_stock_threshold AND NEW.stock_quantity <= NEW.low_stock_threshold AND NEW.stock_quantity > 0 THEN
        INSERT INTO stock_notifications (vendor_id, market_vendor_product_id, notification_type, message)
        SELECT 
            NEW.vendor_id,
            NEW.id,
            'low_stock',
            'Low stock alert: ' || mp.name || ' has only ' || NEW.stock_quantity || ' units remaining (threshold: ' || NEW.low_stock_threshold || ')'
        FROM market_products mp
        WHERE mp.id = NEW.market_product_id;
    END IF;

    -- Check if stock went from in-stock to out-of-stock
    IF OLD.is_in_stock = TRUE AND NEW.is_in_stock = FALSE THEN
        INSERT INTO stock_notifications (vendor_id, market_vendor_product_id, notification_type, message)
        SELECT 
            NEW.vendor_id,
            NEW.id,
            'out_of_stock',
            'Out of stock alert: ' || mp.name || ' is now out of stock'
        FROM market_products mp
        WHERE mp.id = NEW.market_product_id;
    END IF;

    -- Check if stock was restored (out-of-stock to in-stock)
    IF OLD.is_in_stock = FALSE AND NEW.is_in_stock = TRUE THEN
        INSERT INTO stock_notifications (vendor_id, market_vendor_product_id, notification_type, message)
        SELECT 
            NEW.vendor_id,
            NEW.id,
            'stock_restored',
            'Stock restored: ' || mp.name || ' is back in stock with ' || NEW.stock_quantity || ' units'
        FROM market_products mp
        WHERE mp.id = NEW.market_product_id;
    END IF;

    RETURN NEW;
END;
$ language 'plpgsql';

-- Create trigger for stock notifications
CREATE TRIGGER trigger_stock_notifications 
AFTER UPDATE ON public.market_vendor_products 
FOR EACH ROW EXECUTE FUNCTION create_stock_notification();

-- 9. RLS policies for new tables
ALTER TABLE public.market_stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Stock history policies
CREATE POLICY "Vendors can view their own stock history" ON public.market_stock_history
FOR SELECT USING (
    market_vendor_product_id IN (
        SELECT id FROM market_vendor_products 
        WHERE vendor_id IN (
            SELECT id FROM vendors 
            WHERE profile_id = auth.uid()
        )
    )
);

CREATE POLICY "Admins can view all stock history" ON public.market_stock_history
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Stock notifications policies
CREATE POLICY "Vendors can view their own notifications" ON public.stock_notifications
FOR SELECT USING (
    vendor_id IN (
        SELECT id FROM vendors 
        WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Vendors can update their own notifications" ON public.stock_notifications
FOR UPDATE USING (
    vendor_id IN (
        SELECT id FROM vendors 
        WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all notifications" ON public.stock_notifications
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Add comments for documentation
COMMENT ON TABLE public.market_stock_history IS 'Tracks all stock quantity changes for marketplace products';
COMMENT ON TABLE public.stock_notifications IS 'Stores stock-related notifications for vendors';
COMMENT ON FUNCTION get_vendor_low_stock_products(UUID) IS 'Returns low stock and out of stock products for a vendor';
COMMENT ON FUNCTION validate_marketplace_stock(JSONB) IS 'Validates stock availability for multiple products before order placement';
COMMENT ON FUNCTION get_marketplace_stock_analytics() IS 'Returns overall stock analytics for admin dashboard';