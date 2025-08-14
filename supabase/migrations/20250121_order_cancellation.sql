-- Migration: Order Cancellation Feature
-- Description: Add order_cancellations table and related indexes for tracking order cancellations

-- Create the order_cancellations table
CREATE TABLE IF NOT EXISTS public.order_cancellations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  cancellation_reason TEXT NOT NULL,
  additional_details TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_cancellations_order_id ON public.order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_delivery_partner_id ON public.order_cancellations(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_cancelled_at ON public.order_cancellations(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_reason ON public.order_cancellations(cancellation_reason);

-- Add a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_order_cancellations_partner_date ON public.order_cancellations(delivery_partner_id, cancelled_at);

-- Add cancellation_id field to orders table to link to cancellation record
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancellation_id UUID REFERENCES public.order_cancellations(id) ON DELETE SET NULL;

-- Create index on the new foreign key
CREATE INDEX IF NOT EXISTS idx_orders_cancellation_id ON public.orders(cancellation_id);

-- Add RLS (Row Level Security) policies for order_cancellations table
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;

-- Policy for delivery partners to view their own cancellations
CREATE POLICY "Delivery partners can view their own cancellations" ON public.order_cancellations
  FOR SELECT USING (
    delivery_partner_id IN (
      SELECT id FROM public.delivery_partners 
      WHERE profile_id = auth.uid()
    )
  );

-- Policy for delivery partners to insert their own cancellations
CREATE POLICY "Delivery partners can insert their own cancellations" ON public.order_cancellations
  FOR INSERT WITH CHECK (
    delivery_partner_id IN (
      SELECT id FROM public.delivery_partners 
      WHERE profile_id = auth.uid()
    )
  );

-- Policy for vendors to view cancellations of their orders
CREATE POLICY "Vendors can view cancellations of their orders" ON public.order_cancellations
  FOR SELECT USING (
    order_id IN (
      SELECT DISTINCT o.id 
      FROM public.orders o
      JOIN public.order_items oi ON o.id = oi.order_id
      JOIN public.vendors v ON oi.vendor_id = v.id
      WHERE v.profile_id = auth.uid()
    )
  );

-- Policy for admins to view all cancellations
CREATE POLICY "Admins can view all cancellations" ON public.order_cancellations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at on order_cancellations
CREATE TRIGGER update_order_cancellations_updated_at 
  BEFORE UPDATE ON public.order_cancellations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to handle order cancellation logic
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_delivery_partner_id UUID,
  p_cancellation_reason TEXT,
  p_additional_details TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order_record RECORD;
  v_cancellation_id UUID;
  v_result JSON;
BEGIN
  -- Check if order exists and is in valid status for cancellation
  SELECT * INTO v_order_record 
  FROM public.orders 
  WHERE id = p_order_id 
    AND order_status IN ('out_for_delivery', 'picked_up')
    AND cancellation_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found or not eligible for cancellation'
    );
  END IF;
  
  -- Verify delivery partner is assigned to this order
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_partner_orders 
    WHERE order_id = p_order_id AND delivery_partner_id = p_delivery_partner_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Delivery partner not authorized to cancel this order'
    );
  END IF;
  
  -- Start transaction
  BEGIN
    -- Insert cancellation record
    INSERT INTO public.order_cancellations (
      order_id,
      delivery_partner_id,
      cancellation_reason,
      additional_details
    ) VALUES (
      p_order_id,
      p_delivery_partner_id,
      p_cancellation_reason,
      p_additional_details
    ) RETURNING id INTO v_cancellation_id;
    
    -- Update order status and link to cancellation
    UPDATE public.orders 
    SET 
      order_status = 'cancelled',
      cancellation_id = v_cancellation_id,
      cancelled_date = NOW(),
      cancellation_reason = p_cancellation_reason,
      updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Update delivery partner order status
    UPDATE public.delivery_partner_orders 
    SET 
      status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE order_id = p_order_id AND delivery_partner_id = p_delivery_partner_id;
    
    -- Update order items status
    UPDATE public.order_items 
    SET 
      item_status = 'cancelled',
      updated_at = NOW()
    WHERE order_id = p_order_id;
    
    -- Return inventory to vendors (this would need to be implemented based on your inventory system)
    -- For now, we'll just mark the items as cancelled
    
    v_result := json_build_object(
      'success', true,
      'cancellation_id', v_cancellation_id,
      'message', 'Order cancelled successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    v_result := json_build_object(
      'success', false,
      'error', 'Failed to cancel order: ' || SQLERRM
    );
  END;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Create a view for cancellation analytics
CREATE OR REPLACE VIEW public.cancellation_analytics AS
SELECT 
  oc.cancellation_reason,
  COUNT(*) as total_cancellations,
  COUNT(DISTINCT oc.delivery_partner_id) as unique_delivery_partners,
  COUNT(DISTINCT DATE(oc.cancelled_at)) as days_with_cancellations,
  AVG(o.total_amount) as avg_cancelled_order_value,
  SUM(o.total_amount) as total_cancelled_value,
  DATE_TRUNC('month', oc.cancelled_at) as month_year
FROM public.order_cancellations oc
JOIN public.orders o ON oc.order_id = o.id
GROUP BY oc.cancellation_reason, DATE_TRUNC('month', oc.cancelled_at)
ORDER BY month_year DESC, total_cancellations DESC;

-- Grant select permission on the view
GRANT SELECT ON public.cancellation_analytics TO authenticated;

-- Create inventory_adjustments table for tracking inventory changes
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_product_id UUID NOT NULL REFERENCES public.vendor_products(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('manual', 'sale', 'return', 'cancellation_restoration', 'damage', 'restock')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for inventory_adjustments
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_vendor_product_id ON public.inventory_adjustments(vendor_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_adjustment_type ON public.inventory_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created_at ON public.inventory_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_reference_order_id ON public.inventory_adjustments(reference_order_id);

-- Enable RLS for inventory_adjustments
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Policy for vendors to view their own product adjustments
CREATE POLICY "Vendors can view their own product adjustments" ON public.inventory_adjustments
  FOR SELECT USING (
    vendor_product_id IN (
      SELECT id FROM public.vendor_products 
      WHERE vendor_id IN (
        SELECT id FROM public.vendors 
        WHERE profile_id = auth.uid()
      )
    )
  );

-- Policy for vendors to insert adjustments for their own products
CREATE POLICY "Vendors can insert adjustments for their own products" ON public.inventory_adjustments
  FOR INSERT WITH CHECK (
    vendor_product_id IN (
      SELECT id FROM public.vendor_products 
      WHERE vendor_id IN (
        SELECT id FROM public.vendors 
        WHERE profile_id = auth.uid()
      )
    )
  );

-- Policy for admins to view all adjustments
CREATE POLICY "Admins can view all inventory adjustments" ON public.inventory_adjustments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at on inventory_adjustments
CREATE TRIGGER update_inventory_adjustments_updated_at 
  BEFORE UPDATE ON public.inventory_adjustments 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update the cancel_order function to handle inventory restoration
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_delivery_partner_id UUID,
  p_cancellation_reason TEXT,
  p_additional_details TEXT DEFAULT NULL
)
RETURNS JSON AS $
DECLARE
  v_order_record RECORD;
  v_cancellation_id UUID;
  v_result JSON;
  v_order_item RECORD;
BEGIN
  -- Check if order exists and is in valid status for cancellation
  SELECT * INTO v_order_record 
  FROM public.orders 
  WHERE id = p_order_id 
    AND order_status IN ('out_for_delivery', 'picked_up')
    AND cancellation_id IS NULL;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Order not found or not eligible for cancellation'
    );
  END IF;
  
  -- Verify delivery partner is assigned to this order
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_partner_orders 
    WHERE order_id = p_order_id AND delivery_partner_id = p_delivery_partner_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Delivery partner not authorized to cancel this order'
    );
  END IF;
  
  -- Start transaction
  BEGIN
    -- Insert cancellation record
    INSERT INTO public.order_cancellations (
      order_id,
      delivery_partner_id,
      cancellation_reason,
      additional_details
    ) VALUES (
      p_order_id,
      p_delivery_partner_id,
      p_cancellation_reason,
      p_additional_details
    ) RETURNING id INTO v_cancellation_id;
    
    -- Update order status and link to cancellation
    UPDATE public.orders 
    SET 
      order_status = 'cancelled',
      cancellation_id = v_cancellation_id,
      cancelled_date = NOW(),
      cancellation_reason = p_cancellation_reason,
      updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Update delivery partner order status
    UPDATE public.delivery_partner_orders 
    SET 
      status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE order_id = p_order_id AND delivery_partner_id = p_delivery_partner_id;
    
    -- Update order items status and restore inventory
    FOR v_order_item IN 
      SELECT oi.*, vp.stock_quantity, vp.vendor_id
      FROM public.order_items oi
      JOIN public.vendor_products vp ON oi.vendor_product_id = vp.id
      WHERE oi.order_id = p_order_id
    LOOP
      -- Update order item status
      UPDATE public.order_items 
      SET 
        item_status = 'cancelled',
        updated_at = NOW()
      WHERE id = v_order_item.id;
      
      -- Restore inventory
      UPDATE public.vendor_products 
      SET 
        stock_quantity = stock_quantity + v_order_item.quantity,
        is_in_stock = CASE 
          WHEN stock_quantity + v_order_item.quantity > 0 THEN true 
          ELSE false 
        END,
        updated_at = NOW()
      WHERE id = v_order_item.vendor_product_id;
      
      -- Log inventory adjustment
      INSERT INTO public.inventory_adjustments (
        vendor_product_id,
        adjustment_type,
        quantity_change,
        previous_quantity,
        new_quantity,
        reason,
        reference_order_id
      ) VALUES (
        v_order_item.vendor_product_id,
        'cancellation_restoration',
        v_order_item.quantity,
        v_order_item.stock_quantity,
        v_order_item.stock_quantity + v_order_item.quantity,
        'Order cancellation - restored ' || v_order_item.quantity || ' units',
        p_order_id
      );
    END LOOP;
    
    v_result := json_build_object(
      'success', true,
      'cancellation_id', v_cancellation_id,
      'message', 'Order cancelled successfully and inventory restored'
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    v_result := json_build_object(
      'success', false,
      'error', 'Failed to cancel order: ' || SQLERRM
    );
  END;
  
  RETURN v_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE public.order_cancellations IS 'Stores order cancellation records with reasons and details';
COMMENT ON COLUMN public.order_cancellations.order_id IS 'Reference to the cancelled order';
COMMENT ON COLUMN public.order_cancellations.delivery_partner_id IS 'Delivery partner who cancelled the order';
COMMENT ON COLUMN public.order_cancellations.cancellation_reason IS 'Primary reason for cancellation';
COMMENT ON COLUMN public.order_cancellations.additional_details IS 'Optional additional details about the cancellation';
COMMENT ON COLUMN public.order_cancellations.cancelled_at IS 'Timestamp when the order was cancelled';

COMMENT ON FUNCTION public.cancel_order(UUID, UUID, TEXT, TEXT) IS 'Handles the complete order cancellation process including status updates and validation';

COMMENT ON VIEW public.cancellation_analytics IS 'Provides aggregated analytics data for order cancellations';