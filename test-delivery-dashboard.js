// Test script to simulate the exact delivery partner dashboard query
// This will help us understand why orders are not showing in delivery section

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (you may need to adjust this)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_DELIVERY_PARTNER_ID = '747c1649-8331-4956-9fbe-bd19765e30a3';
const TEST_ORDER_ID = '89b232cd-17b6-4e09-8aac-44148555973f';

async function testDashboardQuery() {
  console.log('🧪 Testing Delivery Partner Dashboard Query');
  console.log('='.repeat(60));

  try {
    // Step 1: Get slot-based assignments (same as dashboard)
    console.log('\n1. Getting slot-based assignments...');
    const { data: slotData, error: slotError } = await supabase
      .from('delivery_assignments')
      .select(`
        *,
        delivery_slot:delivery_slots(*),
        sector:sectors(*)
      `)
      .eq('delivery_partner_id', TEST_DELIVERY_PARTNER_ID)
      .eq('assigned_date', new Date().toISOString().split('T')[0])
      .in('status', ['assigned', 'active'])
      .order('slot_id');

    if (slotError) {
      console.error('❌ Error getting slot assignments:', slotError);
      return;
    }

    console.log('📋 Slot assignments found:', slotData?.length || 0);
    
    if (!slotData || slotData.length === 0) {
      console.log('⚠️ No slot assignments found for today. This explains why orders are not showing.');
      return;
    }

    // Step 2: Process each slot assignment
    for (let i = 0; i < slotData.length; i++) {
      const assignment = slotData[i];
      console.log(`\n2.${i + 1}. Processing slot assignment:`, assignment.slot_id);
      
      // Get orders for this slot (same query as dashboard)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_pickups(pickup_status,vendor_id),
          order_items(
            *,
            vendor_products(
              *,
              smartphone_models(model_name)
            ),
            vendors(
              id, 
              business_name, 
              profiles(phone),
              vendor_addresses(
                address_box
              )
            )
          ),
          customer_addresses(*),
          customers(profiles(full_name, phone))
        `)
        .eq('slot_id', assignment.slot_id)
        .eq('delivery_date', assignment.assigned_date);

      if (ordersError) {
        console.error('❌ Error getting orders for slot:', ordersError);
        continue;
      }

      console.log('📦 Orders found for slot:', orders?.length || 0);
      
      if (!orders || orders.length === 0) {
        console.log('⚠️ No orders found for this slot');
        continue;
      }

      // Step 3: Check each order
      let customerDeliveries = [];
      
      for (const order of orders) {
        console.log(`\n   📋 Checking order: ${order.order_number} (${order.id})`);
        console.log(`       Status: ${order.order_status}`);
        console.log(`       Total Amount: ₹${order.total_amount}`);
        
        // Check if our test order is in this slot
        if (order.id === TEST_ORDER_ID) {
          console.log('   🎯 FOUND OUR TEST ORDER!');
          console.log(`       Assignment Slot: ${assignment.slot_id}`);
          console.log(`       Slot Name: ${assignment.delivery_slot?.slot_name}`);
        }
        
        // Check pickup records
        const pickupRecords = order.order_pickups || [];
        console.log(`       Pickup Records: ${pickupRecords.length}`);
        
        pickupRecords.forEach((pickup, idx) => {
          console.log(`         ${idx + 1}. Vendor: ${pickup.vendor_id}, Status: ${pickup.pickup_status}`);
        });
        
        // Apply the same logic as dashboard
        if (order.order_status === 'picked_up' || order.order_status === 'out_for_delivery') {
          console.log('   ✅ Order qualifies for delivery section');
          
          const customerAddress = order.customer_addresses;
          
          customerDeliveries.push({
            order_id: order.id,
            order_number: order.order_number,
            customer_name: order.customers?.profiles?.full_name || 'Unknown',
            customer_phone: order.customers?.profiles?.phone || '',
            delivery_address: customerAddress?.address_box || '',
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            delivery_status: order.order_status === 'out_for_delivery' ? 'out_for_delivery' : 'pending'
          });
        } else {
          console.log('   ❌ Order does NOT qualify for delivery section');
          console.log(`       Reason: Status is '${order.order_status}', needs 'picked_up' or 'out_for_delivery'`);
        }
      }
      
      console.log(`\n   📊 Summary for slot ${assignment.delivery_slot?.slot_name}:`);
      console.log(`       Total Orders: ${orders.length}`);
      console.log(`       Ready for Delivery: ${customerDeliveries.length}`);
      
      if (customerDeliveries.length > 0) {
        console.log('       Orders ready for delivery:');
        customerDeliveries.forEach((delivery, idx) => {
          console.log(`         ${idx + 1}. ${delivery.order_number} - ${delivery.customer_name} - ₹${delivery.total_amount}`);
        });
      }
    }

    console.log('\n🎯 Test completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  testDashboardQuery();
}

export { testDashboardQuery }; 