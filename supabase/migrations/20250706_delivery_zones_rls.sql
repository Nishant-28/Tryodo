-- Enable RLS
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage zones
CREATE POLICY "Zones are viewable by admins"
ON delivery_zones FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can manage zones"
ON delivery_zones FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

-- Allow delivery partners to view zones
CREATE POLICY "Partners can view zones"
ON delivery_zones FOR SELECT
TO authenticated
USING (is_active = true);

-- Insert initial zones
-- INSERT INTO delivery_zones (name, pincodes, is_active)
-- VALUES 
--   ('North Patna', ARRAY['800001', '800002', '800003', '800004', '800005'], true),
--   ('South Patna', ARRAY['800011', '800012', '800013', '800014', '800015'], true),
--   ('East Patna', ARRAY['800006', '800007', '800008', '800009', '800010'], true),
--   ('West Patna', ARRAY['800016', '800017', '800018', '800019', '800020'], true); 