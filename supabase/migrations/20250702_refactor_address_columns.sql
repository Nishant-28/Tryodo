-- Create the 'profiles_remove_address_columns' migration
ALTER TABLE profiles
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS pincode;

-- Create the 'customers_remove_preferred_delivery_address' migration
ALTER TABLE customers
DROP COLUMN IF EXISTS preferred_delivery_address;

-- -- Create the 'orders_update_delivery_address' migration
-- ALTER TABLE orders
-- DROP COLUMN IF EXISTS delivery_address,
-- ADD COLUMN delivery_address_id UUID REFERENCES public.customer_addresses(id);

-- Optional: Add a trigger to set delivery_address_id from preferred address if needed on order creation
-- This depends on how orders are created and linked to addresses.
-- For now, this is a placeholder. You might need to implement this in your application logic
-- or as a database function/trigger if an implicit link is required. 

--- I need to check this....................