-- Create order_item_cancellations table
create table if not exists public.order_item_cancellations (
	id uuid primary key default extensions.uuid_generate_v4(),
	order_id uuid not null references public.orders(id) on delete cascade,
	order_item_id uuid not null references public.order_items(id) on delete cascade,
	cancelled_by_profile_id uuid not null references public.profiles(id),
	cancelled_by role text not null default 'customer',
	reason text not null,
	additional_details text,
	cancelled_at timestamp with time zone not null default now(),
	created_at timestamp with time zone not null default now(),
	updated_at timestamp with time zone not null default now(),
	constraint order_item_cancellations_unique unique (order_item_id)
);

-- Indexes
create index if not exists idx_order_item_cancellations_order_id on public.order_item_cancellations(order_id);
create index if not exists idx_order_item_cancellations_order_item_id on public.order_item_cancellations(order_item_id);
create index if not exists idx_order_item_cancellations_cancelled_by on public.order_item_cancellations(cancelled_by);

-- Trigger to maintain updated_at
create trigger update_order_item_cancellations_updated_at before update on public.order_item_cancellations
for each row execute function public.update_updated_at_column();

-- Add check constraint for allowed reasons
alter table public.order_item_cancellations
	add constraint order_item_cancellations_reason_check check (
		reason in ('FAULT_IN_PRODUCT','NOT_NEEDED_NOW','OTHER')
	);

-- Add check constraint for cancelled_by roles
alter table public.order_item_cancellations
	add constraint order_item_cancellations_cancelled_by_check check (
		cancelled_by in ('customer','delivery_partner','admin')
	);

-- Helper function to cancel a single item with permission checks
create or replace function public.cancel_order_item(
	p_order_id uuid,
	p_order_item_id uuid,
	p_cancelled_by_profile_id uuid,
	p_cancelled_by text,
	p_reason text,
	p_additional_details text default null
) returns json as $$
declare
	v_item record;
	v_order record;
	v_existing record;
	v_is_assigned boolean;
	v_dp_id uuid;
	v_result json;
	v_new_status text;
	v_remaining_active_items int;
	v_cancellation_id uuid;
	v_vendor_product_id uuid;
	v_quantity integer;
begin
	-- Fetch order and item
	select * into v_order from public.orders where id = p_order_id;
	if not found then
		return json_build_object('success', false, 'error', 'Order not found');
	end if;

	select * into v_item from public.order_items where id = p_order_item_id and order_id = p_order_id;
	if not found then
		return json_build_object('success', false, 'error', 'Order item not found');
	end if;

	-- Prevent duplicate cancellations
	select * into v_existing from public.order_item_cancellations where order_item_id = p_order_item_id;
	if found then
		return json_build_object('success', false, 'error', 'Order item already cancelled');
	end if;

	-- Eligibility: allow when order not delivered; allow during picked_up/out_for_delivery or earlier
	if v_order.order_status in ('delivered','returned') then
		return json_build_object('success', false, 'error', 'Order already completed');
	end if;

	-- Delivery partner permission check when cancelled_by = delivery_partner
	if p_cancelled_by = 'delivery_partner' then
		select dpo.delivery_partner_id into v_dp_id
		from public.delivery_partner_orders dpo
		where dpo.order_id = p_order_id;
		
		v_is_assigned := v_dp_id is not null;
		if not v_is_assigned then
			return json_build_object('success', false, 'error', 'Delivery partner not assigned to this order');
		end if;
	end if;

	-- Insert cancellation record
	insert into public.order_item_cancellations (
		order_id, order_item_id, cancelled_by_profile_id, cancelled_by, reason, additional_details
	) values (
		p_order_id, p_order_item_id, p_cancelled_by_profile_id, p_cancelled_by, p_reason, p_additional_details
	) returning id into v_cancellation_id;

	-- Update item status and restore inventory
	update public.order_items set item_status = 'cancelled', updated_at = now() where id = p_order_item_id;

	-- Restore inventory when possible
	select vendor_product_id, quantity into v_vendor_product_id, v_quantity from public.order_items where id = p_order_item_id;
	if v_vendor_product_id is not null then
		update public.vendor_products
		set stock_quantity = stock_quantity + v_quantity,
			is_in_stock = case when stock_quantity + v_quantity > 0 then true else false end,
			updated_at = now()
		where id = v_vendor_product_id;
		
		insert into public.inventory_adjustments (
			vendor_product_id, adjustment_type, quantity_change, previous_quantity, new_quantity, reason, reference_order_id
		) select
			vp.id, 'item_cancellation_restoration', v_quantity, vp.stock_quantity - v_quantity, vp.stock_quantity,
			'Order item cancellation - restored ' || v_quantity || ' units', p_order_id
		from public.vendor_products vp where vp.id = v_vendor_product_id;
	end if;

	-- If all items are now cancelled, update order status to cancelled
	select count(*) into v_remaining_active_items
	from public.order_items
	where order_id = p_order_id and item_status not in ('cancelled','returned');

	if v_remaining_active_items = 0 then
		update public.orders
		set order_status = 'cancelled', cancelled_date = now(), cancellation_reason = coalesce(v_order.cancellation_reason, 'All items cancelled'), updated_at = now()
		where id = p_order_id;
	end if;

	v_result := json_build_object('success', true, 'message', 'Item cancelled successfully');
	return v_result;
exception when others then
	return json_build_object('success', false, 'error', 'Failed to cancel item: ' || sqlerrm);
end;
$$ language plpgsql security definer; 