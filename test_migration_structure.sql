-- Test queries to verify migration structure
-- These queries can be used to validate the migration after it's applied

-- 1. Verify all market tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'market_%'
ORDER BY table_name;

-- 2. Verify cart_items extensions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'cart_items'
AND column_name IN ('product_id', 'market_vendor_product_id')
ORDER BY column_name;

-- 3. Verify order_items extensions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'order_items'
AND column_name IN ('vendor_product_id', 'market_vendor_product_id', 'product_type')
ORDER BY column_name;

-- 4. Verify indexes exist
SELECT indexname, tablename, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'market_%'
ORDER BY tablename, indexname;

-- 5. Verify foreign key constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name LIKE 'market_%'
ORDER BY tc.table_name, tc.constraint_name;

-- 6. Verify views exist
SELECT table_name, view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'market_%'
ORDER BY table_name;

-- 7. Verify triggers exist
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table LIKE 'market_%'
ORDER BY event_object_table, trigger_name;