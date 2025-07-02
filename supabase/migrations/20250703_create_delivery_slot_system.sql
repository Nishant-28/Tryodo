-- Create sectors table for delivery zone management
CREATE TABLE IF NOT EXISTS sectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    pincodes INTEGER[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery slots table
CREATE TABLE IF NOT EXISTS delivery_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    slot_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    cutoff_time TIME NOT NULL,
    pickup_delay_minutes INTEGER DEFAULT 45,
    max_orders INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    day_of_week INTEGER[], -- [0-6] where 0=Sunday, NULL means all days
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery assignments table
CREATE TABLE IF NOT EXISTS delivery_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_partner_id UUID NOT NULL, -- Will reference delivery_partners when table exists
    slot_id UUID REFERENCES delivery_slots(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    sector_id UUID REFERENCES sectors(id) ON DELETE CASCADE,
    max_orders INTEGER DEFAULT 30,
    current_orders INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique assignment per partner per date
    UNIQUE(delivery_partner_id, assigned_date, slot_id)
);

-- Create order pickups tracking table
CREATE TABLE IF NOT EXISTS order_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL, -- Will reference vendors when table structure is confirmed
    delivery_partner_id UUID NOT NULL,
    pickup_status VARCHAR(20) DEFAULT 'pending' CHECK (pickup_status IN ('pending', 'en_route', 'picked_up', 'failed')),
    pickup_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order deliveries tracking table  
CREATE TABLE IF NOT EXISTS order_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    delivery_partner_id UUID NOT NULL,
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'out_for_delivery', 'delivered', 'failed', 'returned')),
    delivery_time TIMESTAMP WITH TIME ZONE,
    delivery_notes TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to orders table for slot system
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES delivery_slots(id),
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES sectors(id),
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS out_for_delivery_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sectors_city_active ON sectors(city_name, is_active);
CREATE INDEX IF NOT EXISTS idx_sectors_pincodes ON sectors USING gin(pincodes);
CREATE INDEX IF NOT EXISTS idx_delivery_slots_sector_active ON delivery_slots(sector_id, is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_date_partner ON delivery_assignments(assigned_date, delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_order_pickups_order_vendor ON order_pickups(order_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_order_partner ON order_deliveries(order_id, delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_orders_slot_date ON orders(slot_id, delivery_date);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
DROP TRIGGER IF EXISTS update_sectors_updated_at ON sectors;
CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON sectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_slots_updated_at ON delivery_slots;
CREATE TRIGGER update_delivery_slots_updated_at BEFORE UPDATE ON delivery_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_pickups_updated_at ON order_pickups;
CREATE TRIGGER update_order_pickups_updated_at BEFORE UPDATE ON order_pickups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_deliveries_updated_at ON order_deliveries;
CREATE TRIGGER update_order_deliveries_updated_at BEFORE UPDATE ON order_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO sectors (city_name, name, pincodes) VALUES 
('Patna', 'Dakbunglow Zone', ARRAY[800001, 800002, 800003]),
('Patna', 'Kankarbagh Zone', ARRAY[800020, 800021, 800022]),
('Patna', 'Boring Road Zone', ARRAY[800013, 800014, 800015])
ON CONFLICT DO NOTHING;

-- Insert sample delivery slots
INSERT INTO delivery_slots (sector_id, slot_name, start_time, end_time, cutoff_time, pickup_delay_minutes, max_orders) 
SELECT 
    s.id,
    slot_data.slot_name,
    slot_data.start_time::TIME,
    slot_data.end_time::TIME,
    slot_data.cutoff_time::TIME,
    slot_data.pickup_delay_minutes,
    slot_data.max_orders
FROM sectors s
CROSS JOIN (
    VALUES 
        ('Morning Express', '10:00', '13:00', '10:00', 45, 30),
        ('Afternoon Express', '13:30', '16:30', '13:30', 45, 35),
        ('Evening Express', '17:00', '20:00', '17:00', 45, 40),
        ('Next Day Morning', '09:00', '12:00', '20:30', 720, 25)
) AS slot_data(slot_name, start_time, end_time, cutoff_time, pickup_delay_minutes, max_orders)
ON CONFLICT DO NOTHING; 