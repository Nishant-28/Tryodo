-- Fix cancelled orders where delivery partner order status was not properly updated
-- This addresses the issue where customer order cancellations did not update delivery partner order status

-- Update existing delivery partner orders for cancelled orders
UPDATE delivery_partner_orders 
SET 
  status = 'cancelled',
  cancelled_at = COALESCE(cancelled_at, NOW()),
  updated_at = NOW()
WHERE order_id IN (
  SELECT id FROM orders WHERE order_status = 'cancelled'
) AND status != 'cancelled';

-- Create a trigger to automatically update delivery partner order status when order is cancelled
CREATE OR REPLACE FUNCTION update_delivery_partner_order_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  -- If order status changed to cancelled, update delivery partner orders
  IF OLD.order_status != 'cancelled' AND NEW.order_status = 'cancelled' THEN
    UPDATE delivery_partner_orders
    SET 
      status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, NOW()),
      updated_at = NOW()
    WHERE order_id = NEW.id AND status != 'cancelled';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_delivery_partner_order_on_cancel ON orders;
CREATE TRIGGER trigger_update_delivery_partner_order_on_cancel
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_partner_order_on_cancel();

-- Add comment for documentation
COMMENT ON FUNCTION update_delivery_partner_order_on_cancel() IS 'Automatically updates delivery partner order status to cancelled when order is cancelled'; 