-- Security Enhancements Migration
-- This migration adds comprehensive security measures and audit logging

-- 1. Create security audit tables

-- Security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security logs for marketplace activities
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_description TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed authentication attempts
CREATE TABLE IF NOT EXISTS public.failed_auth_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    ip_address INET,
    attempt_type VARCHAR(50) NOT NULL,
    failure_reason TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP or user ID
    endpoint VARCHAR(255) NOT NULL,
    violation_count INTEGER DEFAULT 1,
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for security tables
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_severity ON public.security_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_vendor_id ON public.security_logs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_activity_type ON public.security_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_risk_level ON public.security_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_auth_email ON public.failed_auth_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_auth_ip ON public.failed_auth_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_auth_created_at ON public.failed_auth_attempts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_violations(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON public.rate_limit_violations(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked_until ON public.rate_limit_violations(blocked_until);

-- 3. Enhanced RLS policies with security checks

-- Enhanced market products policies
DROP POLICY IF EXISTS "Only admins can manage market products" ON public.market_products;
CREATE POLICY "Only verified admins can manage market products" ON public.market_products
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
        AND profiles.email_confirmed_at IS NOT NULL
    )
);

-- Enhanced vendor product request policies
DROP POLICY IF EXISTS "Vendors can create requests" ON public.market_vendor_product_requests;
CREATE POLICY "Verified vendors can create requests" ON public.market_vendor_product_requests
FOR INSERT WITH CHECK (
    vendor_id IN (
        SELECT v.id FROM vendors v
        JOIN profiles p ON v.profile_id = p.id
        WHERE p.id = auth.uid()
        AND v.is_active = TRUE
        AND v.is_verified = TRUE
        AND p.email_confirmed_at IS NOT NULL
    )
);

-- Enhanced vendor product policies
DROP POLICY IF EXISTS "Vendors can manage their own products" ON public.market_vendor_products;
CREATE POLICY "Verified vendors can manage their own products" ON public.market_vendor_products
FOR ALL USING (
    vendor_id IN (
        SELECT v.id FROM vendors v
        JOIN profiles p ON v.profile_id = p.id
        WHERE p.id = auth.uid()
        AND v.is_active = TRUE
        AND v.is_verified = TRUE
        AND p.email_confirmed_at IS NOT NULL
    )
);

-- Security audit log policies
CREATE POLICY "Users can view their own audit logs" ON public.security_audit_log
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" ON public.security_audit_log
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Security logs policies
CREATE POLICY "Vendors can view their own security logs" ON public.security_logs
FOR SELECT USING (
    vendor_id IN (
        SELECT id FROM vendors 
        WHERE profile_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all security logs" ON public.security_logs
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 4. Create security validation functions

-- Function to validate price changes and prevent manipulation
CREATE OR REPLACE FUNCTION validate_price_change()
RETURNS TRIGGER AS $
DECLARE
    price_change_percent DECIMAL;
    recent_changes INTEGER;
    vendor_verified BOOLEAN;
BEGIN
    -- Check if vendor is verified
    SELECT v.is_verified INTO vendor_verified
    FROM vendors v
    WHERE v.id = NEW.vendor_id;
    
    IF NOT vendor_verified THEN
        RAISE EXCEPTION 'Only verified vendors can update prices';
    END IF;
    
    -- Calculate price change percentage
    IF OLD.price IS NOT NULL AND OLD.price > 0 THEN
        price_change_percent := ABS((NEW.price - OLD.price) / OLD.price) * 100;
        
        -- Prevent extreme price changes (more than 50%)
        IF price_change_percent > 50 THEN
            -- Log suspicious activity
            INSERT INTO security_logs (vendor_id, activity_type, activity_description, details, risk_level)
            VALUES (
                NEW.vendor_id,
                'extreme_price_change',
                'Price change exceeds 50% threshold',
                jsonb_build_object(
                    'product_id', NEW.id,
                    'old_price', OLD.price,
                    'new_price', NEW.price,
                    'change_percent', price_change_percent
                ),
                'high'
            );
            
            RAISE EXCEPTION 'Price change of %.2f%% exceeds maximum allowed change of 50%%', price_change_percent;
        END IF;
        
        -- Check for rapid price changes (more than 3 in 24 hours)
        SELECT COUNT(*) INTO recent_changes
        FROM market_vendor_products
        WHERE id = NEW.id
        AND updated_at > NOW() - INTERVAL '24 hours';
        
        IF recent_changes > 3 THEN
            -- Log suspicious activity
            INSERT INTO security_logs (vendor_id, activity_type, activity_description, details, risk_level)
            VALUES (
                NEW.vendor_id,
                'rapid_price_changes',
                'More than 3 price changes in 24 hours',
                jsonb_build_object(
                    'product_id', NEW.id,
                    'changes_count', recent_changes
                ),
                'medium'
            );
            
            RAISE EXCEPTION 'Too many price changes. Maximum 3 changes per 24 hours allowed.';
        END IF;
    END IF;
    
    -- Validate minimum price
    IF NEW.price < 1 THEN
        RAISE EXCEPTION 'Price must be at least ₹1';
    END IF;
    
    -- Validate maximum price (prevent unrealistic pricing)
    IF NEW.price > 999999 THEN
        RAISE EXCEPTION 'Price cannot exceed ₹999,999';
    END IF;
    
    RETURN NEW;
END;
$ language 'plpgsql';

-- Apply price validation trigger
CREATE TRIGGER trigger_validate_price_change
BEFORE UPDATE OF price ON public.market_vendor_products
FOR EACH ROW EXECUTE FUNCTION validate_price_change();

-- Function to validate stock updates
CREATE OR REPLACE FUNCTION validate_stock_update()
RETURNS TRIGGER AS $
DECLARE
    stock_change INTEGER;
    vendor_verified BOOLEAN;
BEGIN
    -- Check if vendor is verified
    SELECT v.is_verified INTO vendor_verified
    FROM vendors v
    WHERE v.id = NEW.vendor_id;
    
    IF NOT vendor_verified THEN
        RAISE EXCEPTION 'Only verified vendors can update stock';
    END IF;
    
    -- Validate stock quantity limits
    IF NEW.stock_quantity < 0 THEN
        RAISE EXCEPTION 'Stock quantity cannot be negative';
    END IF;
    
    IF NEW.stock_quantity > 999999 THEN
        RAISE EXCEPTION 'Stock quantity cannot exceed 999,999 units';
    END IF;
    
    -- Check for suspicious stock changes
    IF OLD.stock_quantity IS NOT NULL THEN
        stock_change := ABS(NEW.stock_quantity - OLD.stock_quantity);
        
        -- Log large stock increases (potential manipulation)
        IF NEW.stock_quantity > OLD.stock_quantity AND stock_change > 10000 THEN
            INSERT INTO security_logs (vendor_id, activity_type, activity_description, details, risk_level)
            VALUES (
                NEW.vendor_id,
                'large_stock_increase',
                'Stock increased by more than 10,000 units',
                jsonb_build_object(
                    'product_id', NEW.id,
                    'old_stock', OLD.stock_quantity,
                    'new_stock', NEW.stock_quantity,
                    'increase', stock_change
                ),
                'medium'
            );
        END IF;
    END IF;
    
    -- Validate low stock threshold
    IF NEW.low_stock_threshold < 0 THEN
        RAISE EXCEPTION 'Low stock threshold cannot be negative';
    END IF;
    
    IF NEW.low_stock_threshold > NEW.stock_quantity THEN
        NEW.low_stock_threshold := NEW.stock_quantity;
    END IF;
    
    RETURN NEW;
END;
$ language 'plpgsql';

-- Apply stock validation trigger
CREATE TRIGGER trigger_validate_stock_update
BEFORE UPDATE OF stock_quantity, low_stock_threshold ON public.market_vendor_products
FOR EACH ROW EXECUTE FUNCTION validate_stock_update();

-- Function to log marketplace activities
CREATE OR REPLACE FUNCTION log_marketplace_activity()
RETURNS TRIGGER AS $
BEGIN
    -- Log product creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO security_audit_log (event_type, user_id, details, severity)
        VALUES (
            'marketplace_product_created',
            auth.uid(),
            jsonb_build_object(
                'product_id', NEW.id,
                'vendor_id', NEW.vendor_id,
                'price', NEW.price,
                'stock_quantity', NEW.stock_quantity
            ),
            'low'
        );
        RETURN NEW;
    END IF;
    
    -- Log product updates
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO security_audit_log (event_type, user_id, details, severity)
        VALUES (
            'marketplace_product_updated',
            auth.uid(),
            jsonb_build_object(
                'product_id', NEW.id,
                'vendor_id', NEW.vendor_id,
                'changes', jsonb_build_object(
                    'price_changed', OLD.price != NEW.price,
                    'stock_changed', OLD.stock_quantity != NEW.stock_quantity,
                    'status_changed', OLD.is_active != NEW.is_active
                )
            ),
            'low'
        );
        RETURN NEW;
    END IF;
    
    -- Log product deletion
    IF TG_OP = 'DELETE' THEN
        INSERT INTO security_audit_log (event_type, user_id, details, severity)
        VALUES (
            'marketplace_product_deleted',
            auth.uid(),
            jsonb_build_object(
                'product_id', OLD.id,
                'vendor_id', OLD.vendor_id
            ),
            'medium'
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$ language 'plpgsql';

-- Apply activity logging trigger
CREATE TRIGGER trigger_log_marketplace_activity
AFTER INSERT OR UPDATE OR DELETE ON public.market_vendor_products
FOR EACH ROW EXECUTE FUNCTION log_marketplace_activity();

-- 5. Create security monitoring functions

-- Function to detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_patterns()
RETURNS TABLE (
    vendor_id UUID,
    vendor_name TEXT,
    suspicious_activities JSONB,
    risk_score INTEGER
) AS $
DECLARE
    vendor_record RECORD;
    risk_score INTEGER;
    activities JSONB;
BEGIN
    FOR vendor_record IN 
        SELECT v.id, v.business_name
        FROM vendors v
        WHERE v.is_active = TRUE
    LOOP
        risk_score := 0;
        activities := '[]'::jsonb;
        
        -- Check for rapid price changes
        IF EXISTS (
            SELECT 1 FROM security_logs sl
            WHERE sl.vendor_id = vendor_record.id
            AND sl.activity_type IN ('extreme_price_change', 'rapid_price_changes')
            AND sl.created_at > NOW() - INTERVAL '7 days'
        ) THEN
            risk_score := risk_score + 30;
            activities := activities || '["rapid_price_changes"]'::jsonb;
        END IF;
        
        -- Check for unusual stock patterns
        IF EXISTS (
            SELECT 1 FROM security_logs sl
            WHERE sl.vendor_id = vendor_record.id
            AND sl.activity_type = 'large_stock_increase'
            AND sl.created_at > NOW() - INTERVAL '7 days'
        ) THEN
            risk_score := risk_score + 20;
            activities := activities || '["unusual_stock_patterns"]'::jsonb;
        END IF;
        
        -- Check for multiple failed operations
        IF (
            SELECT COUNT(*) FROM security_audit_log sal
            WHERE sal.user_id IN (
                SELECT profile_id FROM vendors WHERE id = vendor_record.id
            )
            AND sal.event_type LIKE '%failed%'
            AND sal.created_at > NOW() - INTERVAL '24 hours'
        ) > 5 THEN
            risk_score := risk_score + 25;
            activities := activities || '["multiple_failures"]'::jsonb;
        END IF;
        
        -- Return vendors with risk score > 30
        IF risk_score > 30 THEN
            vendor_id := vendor_record.id;
            vendor_name := vendor_record.business_name;
            suspicious_activities := activities;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$ language 'plpgsql';

-- Function to get security metrics
CREATE OR REPLACE FUNCTION get_security_metrics(
    p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_security_events BIGINT,
    high_risk_events BIGINT,
    failed_auth_attempts BIGINT,
    suspicious_vendors BIGINT,
    price_manipulation_attempts BIGINT,
    avg_risk_score NUMERIC
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM security_audit_log 
         WHERE created_at > NOW() - (p_days || ' days')::INTERVAL),
        (SELECT COUNT(*) FROM security_audit_log 
         WHERE severity IN ('high', 'critical') 
         AND created_at > NOW() - (p_days || ' days')::INTERVAL),
        (SELECT COUNT(*) FROM failed_auth_attempts 
         WHERE created_at > NOW() - (p_days || ' days')::INTERVAL),
        (SELECT COUNT(*) FROM detect_suspicious_patterns()),
        (SELECT COUNT(*) FROM security_logs 
         WHERE activity_type LIKE '%price%' 
         AND created_at > NOW() - (p_days || ' days')::INTERVAL),
        (SELECT AVG(risk_score) FROM detect_suspicious_patterns());
END;
$ language 'plpgsql';

-- 6. Create cleanup functions for security tables

-- Function to clean up old security logs
CREATE OR REPLACE FUNCTION cleanup_security_logs()
RETURNS void AS $
BEGIN
    -- Keep security audit logs for 1 year
    DELETE FROM security_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Keep security logs for 6 months
    DELETE FROM security_logs 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Keep failed auth attempts for 3 months
    DELETE FROM failed_auth_attempts 
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    -- Clean up expired rate limit violations
    DELETE FROM rate_limit_violations 
    WHERE blocked_until < NOW() - INTERVAL '1 day';
END;
$ language 'plpgsql';

-- 7. Enable RLS on security tables
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- RLS policies for failed auth attempts (admin only)
CREATE POLICY "Only admins can view failed auth attempts" ON public.failed_auth_attempts
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- RLS policies for rate limit violations (admin only)
CREATE POLICY "Only admins can view rate limit violations" ON public.rate_limit_violations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 8. Add security constraints to existing tables

-- Add constraints to prevent data manipulation
ALTER TABLE public.market_vendor_products 
ADD CONSTRAINT check_reasonable_price 
CHECK (price >= 0.01 AND price <= 999999.99);

ALTER TABLE public.market_vendor_products 
ADD CONSTRAINT check_reasonable_stock 
CHECK (stock_quantity >= 0 AND stock_quantity <= 999999);

ALTER TABLE public.market_vendor_products 
ADD CONSTRAINT check_reasonable_delivery_time 
CHECK (delivery_time_hours >= 1 AND delivery_time_hours <= 720); -- Max 30 days

ALTER TABLE public.market_vendor_product_requests 
ADD CONSTRAINT check_reasonable_proposed_price 
CHECK (proposed_price >= 0.01 AND proposed_price <= 999999.99);

ALTER TABLE public.market_vendor_product_requests 
ADD CONSTRAINT check_reasonable_proposed_stock 
CHECK (stock_quantity >= 0 AND stock_quantity <= 999999);

-- 9. Add comments for documentation
COMMENT ON TABLE public.security_audit_log IS 'Comprehensive audit log for all security-related events';
COMMENT ON TABLE public.security_logs IS 'Marketplace-specific security events and suspicious activities';
COMMENT ON TABLE public.failed_auth_attempts IS 'Failed authentication attempts for security monitoring';
COMMENT ON TABLE public.rate_limit_violations IS 'Rate limiting violations and blocked requests';

COMMENT ON FUNCTION validate_price_change() IS 'Validates price changes to prevent manipulation and fraud';
COMMENT ON FUNCTION validate_stock_update() IS 'Validates stock updates to prevent unrealistic inventory changes';
COMMENT ON FUNCTION detect_suspicious_patterns() IS 'Detects suspicious vendor behavior patterns';
COMMENT ON FUNCTION get_security_metrics(INTEGER) IS 'Returns security metrics for monitoring dashboard';
COMMENT ON FUNCTION cleanup_security_logs() IS 'Cleans up old security logs to maintain performance';