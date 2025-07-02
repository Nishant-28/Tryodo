-- Create delivery partners table
CREATE TABLE IF NOT EXISTS delivery_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL,
    vehicle_number VARCHAR(20) NOT NULL,
    is_available BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    current_latitude DECIMAL(10,8),
    current_longitude DECIMAL(11,8),
    assigned_pincodes TEXT[] DEFAULT '{}',
    average_delivery_time_minutes INTEGER DEFAULT 0,
    wallet_balance DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5)
);

-- Create delivery zones table
CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    pincodes TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delivery partner earnings table
CREATE TABLE IF NOT EXISTS delivery_partner_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_partner_id UUID REFERENCES delivery_partners(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delivery partner documents table
CREATE TABLE IF NOT EXISTS delivery_partner_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_partner_id UUID REFERENCES delivery_partners(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    document_url TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verification_date TIMESTAMPTZ,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delivery partner attendance table
CREATE TABLE IF NOT EXISTS delivery_partner_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_partner_id UUID REFERENCES delivery_partners(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ,
    total_orders INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.0,
    total_distance DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_delivery_partners_updated_at
    BEFORE UPDATE ON delivery_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_zones_updated_at
    BEFORE UPDATE ON delivery_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_partner_earnings_updated_at
    BEFORE UPDATE ON delivery_partner_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_partner_documents_updated_at
    BEFORE UPDATE ON delivery_partner_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_partner_attendance_updated_at
    BEFORE UPDATE ON delivery_partner_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_partner_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_partner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_partner_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_partners
CREATE POLICY "Delivery partners are viewable by admins"
    ON delivery_partners FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Delivery partners can view their own record"
    ON delivery_partners FOR SELECT
    TO authenticated
    USING (auth.uid() = profile_id);

CREATE POLICY "Only admins can insert delivery partners"
    ON delivery_partners FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update delivery partners"
    ON delivery_partners FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Policies for delivery_zones
CREATE POLICY "Delivery zones are viewable by authenticated users"
    ON delivery_zones FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage delivery zones"
    ON delivery_zones FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Policies for delivery_partner_earnings
CREATE POLICY "Earnings are viewable by admins"
    ON delivery_partner_earnings FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Partners can view their own earnings"
    ON delivery_partner_earnings FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM delivery_partners
        WHERE id = delivery_partner_earnings.delivery_partner_id
        AND profile_id = auth.uid()
    ));

CREATE POLICY "Only admins can manage earnings"
    ON delivery_partner_earnings FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Policies for delivery_partner_documents
CREATE POLICY "Documents are viewable by admins"
    ON delivery_partner_documents FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Partners can view their own documents"
    ON delivery_partner_documents FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM delivery_partners
        WHERE id = delivery_partner_documents.delivery_partner_id
        AND profile_id = auth.uid()
    ));

CREATE POLICY "Only admins can manage documents"
    ON delivery_partner_documents FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Policies for delivery_partner_attendance
CREATE POLICY "Attendance is viewable by admins"
    ON delivery_partner_attendance FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Partners can view their own attendance"
    ON delivery_partner_attendance FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM delivery_partners
        WHERE id = delivery_partner_attendance.delivery_partner_id
        AND profile_id = auth.uid()
    ));

CREATE POLICY "Partners can insert their own attendance"
    ON delivery_partner_attendance FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM delivery_partners
        WHERE id = delivery_partner_attendance.delivery_partner_id
        AND profile_id = auth.uid()
    ));

CREATE POLICY "Only admins can manage all attendance records"
    ON delivery_partner_attendance FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin'); 