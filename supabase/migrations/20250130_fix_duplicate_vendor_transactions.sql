-- Fix Duplicate Vendor Transaction Creation
-- This migration improves the process_order_completion function to check for existing transactions
-- before creating new ones, preventing the duplicate transaction error

CREATE OR REPLACE FUNCTION public.process_order_completion(p_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_order_record orders%ROWTYPE;
  v_item_record order_items%ROWTYPE;
  v_transaction_number text;
  v_transaction_id uuid;
  v_delivery_partner_order delivery_partner_orders%ROWTYPE;
  v_item_counter integer := 0;
  v_existing_transaction_count integer;
BEGIN
  -- Get order details
  SELECT * INTO v_order_record FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Process each order item
  FOR v_item_record IN
    SELECT * FROM order_items WHERE order_id = p_order_id
  LOOP
    v_item_counter := v_item_counter + 1;

    -- Check if transactions already exist for this order item
    SELECT COUNT(*) INTO v_existing_transaction_count
    FROM transactions
    WHERE order_id = p_order_id
      AND order_item_id = v_item_record.id
      AND transaction_type = 'vendor_earning';

    -- Only create transaction if it doesn't already exist
    IF v_existing_transaction_count = 0 THEN
      -- Generate unique transaction number with microseconds, random component, and item counter
      -- Format: TXN-YYYYMMDD-HHMMSS-MICROSECONDS-ITEMCOUNTER-RANDOM6DIGITS
      v_transaction_number := 'TXN-' || to_char(now(), 'YYYYMMDD-HH24MISS-US') || '-' ||
                             v_item_counter::text || '-' ||
                             lpad((random() * 999999)::integer::text, 6, '0');

      -- Create main transaction record
      INSERT INTO transactions (
        transaction_number,
        order_id,
        order_item_id,
        transaction_type,
        transaction_status,
        gross_amount,
        commission_amount, -- Set to 0 as calculate_commission is removed
        net_amount,        -- Set to line_total as calculate_commission is removed
        from_party_type,
        from_party_id,
        to_party_type,
        to_party_id,
        commission_rate_used, -- Set to 0 as calculate_commission is removed
        transaction_date,
        processed_at,
        description
      ) VALUES (
        v_transaction_number,
        p_order_id,
        v_item_record.id,
        'vendor_earning',
        'completed',
        v_item_record.line_total,
        0, -- No commission deducted for now
        v_item_record.line_total, -- Vendor gets full line_total for now
        'customer',
        (SELECT c.id FROM customers c WHERE c.id = v_order_record.customer_id),
        'vendor',
        v_item_record.vendor_id,
        0, -- No commission rate used for now
        now(),
        now(),
        'Order completion - vendor earning for item: ' || v_item_record.product_name
      ) RETURNING id INTO v_transaction_id;

      -- Update vendor wallet (only if transaction was created)
      INSERT INTO vendor_wallets (vendor_id, pending_balance, available_balance, total_earned, total_paid_out, today_earnings, week_earnings, month_earnings, total_commission_paid, average_commission_rate, last_transaction_date)
      VALUES (
        v_item_record.vendor_id,
        v_item_record.line_total, -- Vendor gets full amount for now
        0,
        v_item_record.line_total,
        0,
        v_item_record.line_total,
        v_item_record.line_total,
        v_item_record.line_total,
        0, -- No commission paid for now
        0, -- No average commission rate for now
        now()
      )
      ON CONFLICT (vendor_id) DO UPDATE SET
        pending_balance = vendor_wallets.pending_balance + v_item_record.line_total,
        total_earned = vendor_wallets.total_earned + v_item_record.line_total,
        today_earnings = vendor_wallets.today_earnings + v_item_record.line_total,
        week_earnings = vendor_wallets.week_earnings + v_item_record.line_total,
        month_earnings = vendor_wallets.month_earnings + v_item_record.line_total,
        total_commission_paid = vendor_wallets.total_commission_paid + 0,
        average_commission_rate = vendor_wallets.average_commission_rate, -- Keep existing average or handle recalculation
        last_transaction_date = now(),
        updated_at = now();

      -- Log that transaction was created
      RAISE NOTICE 'Created vendor_earning transaction for order_item_id: % with amount: %', v_item_record.id, v_item_record.line_total;
    ELSE
      -- Log that transaction was skipped
      RAISE NOTICE 'Skipped vendor_earning transaction for order_item_id: % - already exists (count: %)', v_item_record.id, v_existing_transaction_count;
    END IF;
  END LOOP;

  -- Update platform wallet (only process once per order, check if already processed)
  IF NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE order_id = p_order_id 
    AND description LIKE '%platform processing for order%'
  ) THEN
    INSERT INTO platform_wallet (id, total_commission_earned, today_commission, week_commission, month_commission, year_commission, total_transactions_processed, today_transactions, week_transactions, month_transactions, last_updated)
    VALUES (
      COALESCE((SELECT id FROM platform_wallet LIMIT 1), gen_random_uuid()),
      0, -- No commission earned for now
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      total_commission_earned = platform_wallet.total_commission_earned + 0,
      today_commission = platform_wallet.today_commission + 0,
      week_commission = platform_wallet.week_commission + 0,
      month_commission = platform_wallet.month_commission + 0,
      year_commission = platform_wallet.year_commission + 0,
      total_transactions_processed = platform_wallet.total_transactions_processed + 1,
      today_transactions = platform_wallet.today_transactions + 1,
      week_transactions = platform_wallet.week_transactions + 1,
      month_transactions = platform_wallet.month_transactions + 1,
      last_updated = now(),
      updated_at = now();
  END IF;

  -- Process delivery partner earnings if delivery exists
  SELECT * INTO v_delivery_partner_order
  FROM delivery_partner_orders
  WHERE order_id = p_order_id AND status = 'delivered';

  IF FOUND THEN
    -- Check if delivery earning already exists
    IF NOT EXISTS (
      SELECT 1 FROM delivery_earnings 
      WHERE delivery_partner_order_id = v_delivery_partner_order.id
    ) THEN
      -- Create delivery earning record
      INSERT INTO delivery_earnings (
        delivery_partner_order_id,
        delivery_partner_id,
        order_id,
        incentive_amount,
        total_earning,
        earning_status
      ) VALUES (
        v_delivery_partner_order.id,
        v_delivery_partner_order.delivery_partner_id,
        p_order_id,
        5.00, -- ₹5 per delivery
        5.00,
        'confirmed'
      );

      -- Update delivery partner wallet
      INSERT INTO delivery_partner_wallets (
        delivery_partner_id,
        pending_balance,
        total_earned,
        incentive_earnings,
        today_earnings,
        week_earnings,
        month_earnings,
        today_deliveries,
        week_deliveries,
        month_deliveries,
        last_delivery_date
      ) VALUES (
        v_delivery_partner_order.delivery_partner_id,
        5.00,
        5.00,
        5.00,
        5.00,
        5.00,
        5.00,
        1,
        1,
        1,
        now()
      )
      ON CONFLICT (delivery_partner_id) DO UPDATE SET
        pending_balance = delivery_partner_wallets.pending_balance + 5.00,
        total_earned = delivery_partner_wallets.total_earned + 5.00,
        incentive_earnings = delivery_partner_wallets.incentive_earnings + 5.00,
        today_earnings = delivery_partner_wallets.today_earnings + 5.00,
        week_earnings = delivery_partner_wallets.week_earnings + 5.00,
        month_earnings = delivery_partner_wallets.month_earnings + 5.00,
        today_deliveries = delivery_partner_wallets.today_deliveries + 1,
        week_deliveries = delivery_partner_wallets.week_deliveries + 1,
        month_deliveries = delivery_partner_wallets.month_deliveries + 1,
        last_delivery_date = now(),
        updated_at = now();
    END IF;
  END IF;

  RETURN true;
END;
$function$;

-- Add a comment to document the fix
COMMENT ON FUNCTION public.process_order_completion(uuid) IS 
'Improved version that checks for existing transactions before creating new ones to prevent duplicates. Fixed duplicate vendor_earning transaction creation issue.'; 