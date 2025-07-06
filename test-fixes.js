// Simple test script for delivery system fixes
// Run this in the browser console after logging into the delivery partner dashboard

async function testDeliverySystemFixes() {
  console.log('🧪 Testing Delivery System Fixes');
  console.log('='.repeat(50));

  const DELIVERY_PARTNER_ID = '747c1649-8331-4956-9fbe-bd19765e30a3';
  const TARGET_DATE = new Date().toISOString().split('T')[0];

  try {
    // Test 1: Check if we can access the DeliveryAPI
    if (typeof window !== 'undefined' && window.supabase) {
      console.log('✅ Running in browser environment');
      
      // Test slot assignments query
      const { data: slotData, error: slotError } = await window.supabase
        .from('delivery_assignments')
        .select(`
          *,
          delivery_slot:delivery_slots(*),
          sector:sectors(*)
        `)
        .eq('delivery_partner_id', DELIVERY_PARTNER_ID)
        .eq('assigned_date', TARGET_DATE)
        .in('status', ['assigned', 'active']);

      if (slotError) {
        console.error('❌ Error fetching slot assignments:', slotError);
        return;
      }

      console.log(`📋 Found ${slotData?.length || 0} slot assignments for today`);

      if (slotData && slotData.length > 0) {
        for (const assignment of slotData) {
          console.log(`\n📍 Slot: ${assignment.delivery_slot?.slot_name}`);
          console.log(`   Time: ${assignment.delivery_slot?.start_time} - ${assignment.delivery_slot?.end_time}`);
          console.log(`   Sector: ${assignment.sector?.name}`);

          // Check orders for this slot
          const { data: orders, error: ordersError } = await window.supabase
            .from('orders')
            .select(`
              id,
              order_number,
              order_status,
              total_amount,
              delivery_partner_orders(delivery_partner_id, status)
            `)
            .eq('slot_id', assignment.slot_id)
            .eq('delivery_date', assignment.assigned_date);

          if (ordersError) {
            console.error('   ❌ Error fetching orders:', ordersError);
            continue;
          }

          const totalOrders = orders?.length || 0;
          const assignedOrders = orders?.filter(order => 
            order.delivery_partner_orders?.some(dpo => dpo.delivery_partner_id === DELIVERY_PARTNER_ID)
          ) || [];

          console.log(`   📦 Orders: ${assignedOrders.length}/${totalOrders} assigned to partner`);

          // Show order details
          assignedOrders.forEach((order, index) => {
            console.log(`     ${index + 1}. ${order.order_number} (${order.order_status}) - ₹${order.total_amount}`);
          });

          // If orders exist but none are assigned, this indicates the bug
          if (totalOrders > 0 && assignedOrders.length === 0) {
            console.log('   ⚠️ BUG DETECTED: Orders exist but none are assigned to delivery partner');
            console.log('   💡 Fix: Create delivery_partner_orders records for these orders');
          }
        }
      } else {
        console.log('⚠️ No slot assignments found - this could indicate the auto-assignment hasn\'t run');
      }

      // Test 2: Check overall order status
      const { data: allOrders, error: allOrdersError } = await window.supabase
        .from('orders')
        .select('order_status')
        .eq('delivery_date', TARGET_DATE);

      if (!allOrdersError && allOrders) {
        const statusCounts = allOrders.reduce((acc, order) => {
          acc[order.order_status] = (acc[order.order_status] || 0) + 1;
          return acc;
        }, {});

        console.log('\n📊 Order Status Summary for Today:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count} orders`);
        });
      }

      console.log('\n🎯 Test completed!');
      console.log('If you see "BUG DETECTED" messages, the fixes need to be applied.');

    } else {
      console.log('❌ Not running in browser environment or supabase not available');
      console.log('Please run this script in the browser console on the delivery dashboard page');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Instructions for manual fixes
function showManualFixInstructions() {
  console.log('\n🔧 Manual Fix Instructions:');
  console.log('='.repeat(50));
  console.log('1. If you see missing slot assignments:');
  console.log('   - Run the auto-assignment function');
  console.log('   - Check if delivery partners are available and verified');
  console.log('');
  console.log('2. If you see orders without delivery_partner_orders records:');
  console.log('   - The dashboard should now auto-create these records');
  console.log('   - Refresh the delivery partner dashboard to trigger the fix');
  console.log('');
  console.log('3. If slots are being filtered out too early:');
  console.log('   - The time filtering logic has been updated with buffers');
  console.log('   - Slots now have 1-hour grace period after end time');
  console.log('');
  console.log('4. To test the fixes:');
  console.log('   - Navigate to the delivery partner dashboard');
  console.log('   - Check if orders are now visible in the slot sections');
  console.log('   - Verify pickup and delivery sections show appropriate orders');
}

// Run the test
testDeliverySystemFixes();
showManualFixInstructions(); 