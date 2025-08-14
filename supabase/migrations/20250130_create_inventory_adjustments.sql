-- Create inventory_adjustments table for detailed tracking of stock changes
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_product_id UUID NOT NULL REFERENCES vendor_products(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('manual', 'sale', 'return', 'cancellation_restoration', 'damage', 'restock', 'transfer', 'correction', 'expired', 'stolen')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  reference_order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  batch_number TEXT,
  expiry_date DATE,
  cost_per_unit NUMERIC(10,2),
  total_cost NUMERIC(12,2),
  notes TEXT,
  adjustment_source TEXT DEFAULT 'manual' CHECK (adjustment_source IN ('manual', 'automatic', 'system', 'api')),
  location TEXT,
  supplier_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_vendor_product_id ON inventory_adjustments(vendor_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created_at ON inventory_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_adjustment_type ON inventory_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_reference_order_id ON inventory_adjustments(reference_order_id);

-- Create RLS policies
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow vendors to see their own product adjustments
CREATE POLICY "Vendors can view their product adjustments" ON inventory_adjustments
  FOR SELECT USING (
    vendor_product_id IN (
      SELECT id FROM vendor_products WHERE vendor_id = auth.uid()
    )
  );

-- Allow vendors to create adjustments for their products
CREATE POLICY "Vendors can create adjustments for their products" ON inventory_adjustments
  FOR INSERT WITH CHECK (
    vendor_product_id IN (
      SELECT id FROM vendor_products WHERE vendor_id = auth.uid()
    )
  );

-- Allow admins full access
CREATE POLICY "Admins have full access to inventory adjustments" ON inventory_adjustments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create function to automatically create adjustment records when stock changes
CREATE OR REPLACE FUNCTION create_inventory_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create adjustment if stock_quantity has changed
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    INSERT INTO inventory_adjustments (
      vendor_product_id,
      adjustment_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      reason,
      created_by,
      adjustment_source
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'restock'
        ELSE 'manual'
      END,
      NEW.stock_quantity - OLD.stock_quantity,
      OLD.stock_quantity,
      NEW.stock_quantity,
      'Automatic adjustment from stock update',
      auth.uid(),
      'automatic'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically track stock changes
DROP TRIGGER IF EXISTS trigger_vendor_product_stock_change ON vendor_products;
CREATE TRIGGER trigger_vendor_product_stock_change
  AFTER UPDATE ON vendor_products
  FOR EACH ROW
  EXECUTE FUNCTION create_inventory_adjustment();

-- Create function to track order-related inventory adjustments
CREATE OR REPLACE FUNCTION track_order_inventory_adjustment()
RETURNS TRIGGER AS $$
DECLARE
  vendor_prod_id UUID;
  product_quantity INTEGER;
BEGIN
  -- Get vendor product ID from order item
  SELECT vp.id, vp.stock_quantity INTO vendor_prod_id, product_quantity
  FROM vendor_products vp
  JOIN order_items oi ON oi.vendor_id = vp.vendor_id
  WHERE oi.id = NEW.id;

  -- Create adjustment record for order-related stock changes
  IF vendor_prod_id IS NOT NULL THEN
    INSERT INTO inventory_adjustments (
      vendor_product_id,
      adjustment_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      reason,
      reference_order_id,
      reference_order_item_id,
      adjustment_source
    ) VALUES (
      vendor_prod_id,
      'sale',
      -NEW.quantity,
      product_quantity,
      product_quantity - NEW.quantity,
      'Stock reduced due to order: ' || (SELECT order_number FROM orders WHERE id = NEW.order_id),
      NEW.order_id,
      NEW.id,
      'automatic'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_adjustments_updated_at
  BEFORE UPDATE ON inventory_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 