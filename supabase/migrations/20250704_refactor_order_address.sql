-- Drop dependent views
DROP VIEW IF EXISTS public.vendor_pending_orders;
DROP VIEW IF EXISTS public.vendor_confirmed_orders;

-- Alter the orders table to remove delivery_address and add delivery_address_id
ALTER TABLE orders
DROP COLUMN IF EXISTS delivery_address,
ADD COLUMN delivery_address_id UUID REFERENCES public.customer_addresses(id);

-- Recreate vendor_pending_orders view with delivery_address_id
CREATE VIEW public.vendor_pending_orders AS
SELECT
  oi.id AS order_item_id,
  oi.order_id,
  o.order_number,
  o.customer_id,
  o.total_amount,
  o.order_status,
  o.payment_status,
  ca.address_box || ', ' || ca.pincode AS delivery_address, -- Reconstruct address from customer_addresses
  o.created_at,
  oi.vendor_id,
  oi.product_name,
  oi.product_description,
  oi.unit_price,
  oi.quantity,
  oi.line_total,
  oi.item_status,
  v.business_name AS vendor_business_name,
  v.auto_approve_orders,
  v.order_confirmation_timeout_minutes,
  v.auto_approve_under_amount,
  v.business_hours_start,
  v.business_hours_end,
  v.auto_approve_during_business_hours_only,
  p.id AS customer_profile_id,
  GREATEST(
    0::numeric,
    v.order_confirmation_timeout_minutes::numeric - EXTRACT(
      epoch
      FROM
        now() - o.created_at
    ) / 60::numeric
  )::integer AS minutes_remaining,
  CASE
    WHEN v.auto_approve_orders = TRUE
    AND (
      v.auto_approve_under_amount IS NULL
      OR oi.line_total <= v.auto_approve_under_amount
    )
    AND (
      v.auto_approve_during_business_hours_only = FALSE
      OR CURRENT_TIME >= v.business_hours_start::time
      AND CURRENT_TIME <= v.business_hours_end::time
    ) THEN TRUE
    ELSE FALSE
  END AS should_auto_approve
FROM
  order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN vendors v ON oi.vendor_id = v.id
  JOIN customers c ON o.customer_id = c.id
  JOIN profiles p ON c.profile_id = p.id
  LEFT JOIN public.customer_addresses ca ON o.delivery_address_id = ca.id
WHERE
  oi.item_status::text = 'pending'::text
  AND o.order_status::text = 'pending'::text
  AND v.is_active = TRUE;

-- Recreate vendor_confirmed_orders view with delivery_address_id
CREATE VIEW public.vendor_confirmed_orders AS
SELECT
  oi.id AS item_id,
  oi.order_id,
  o.order_number,
  o.customer_id,
  ca.address_box || ', ' || ca.pincode AS delivery_address, -- Reconstruct address from customer_addresses
  o.created_at AS order_date,
  o.total_amount,
  o.order_status,
  o.payment_status,
  oi.vendor_id,
  oi.product_name,
  oi.product_description,
  oi.unit_price,
  oi.quantity,
  oi.line_total,
  oi.item_status,
  oi.picked_up_at,
  oi.pickup_confirmed_by,
  oi.vendor_notes,
  oi.updated_at,
  cp.full_name AS customer_name,
  cp.phone AS customer_phone,
  dpo.delivery_partner_id,
  dp.full_name AS delivery_partner_name,
  dp.phone AS delivery_partner_phone,
  dpo.pickup_otp,
  dpo.delivery_otp,
  dpo.status AS delivery_status,
  dpo.accepted_at AS delivery_assigned_at,
  dpo.picked_up_at AS delivery_picked_up_at,
  dpo.delivered_at,
  CASE
    WHEN dpo.delivered_at IS NOT NULL THEN 'delivered'::text
    WHEN dpo.picked_up_at IS NOT NULL THEN 'out_for_delivery'::text
    WHEN dpo.accepted_at IS NOT NULL THEN 'assigned_to_delivery'::text
    ELSE 'confirmed'::text
  END AS current_status
FROM
  order_items oi
  JOIN orders o ON oi.order_id = o.id
  JOIN customers c ON o.customer_id = c.id
  JOIN profiles cp ON c.profile_id = cp.id
  LEFT JOIN public.customer_addresses ca ON o.delivery_address_id = ca.id -- Join to customer_addresses
  LEFT JOIN delivery_partner_orders dpo ON o.id = dpo.order_id
  LEFT JOIN delivery_partners dp_entity ON dpo.delivery_partner_id = dp_entity.id
  LEFT JOIN profiles dp ON dp_entity.profile_id = dp.id
WHERE
  oi.item_status::text = ANY (
    ARRAY[
      'confirmed'::character varying,
      'processing'::character varying,
      'packed'::character varying,
      'picked_up'::character varying,
      'shipped'::character varying,
      'delivered'::character varying
    ]::text[]
  ); 