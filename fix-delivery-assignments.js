// Fix script for delivery partner assignment issues
// This script addresses the main bugs in the slot-based delivery system

import { DeliveryAPI } from './src/lib/deliveryApi.ts';

const DELIVERY_PARTNER_ID = '747c1649-8331-4956-9fbe-bd19765e30a3'; // Test delivery partner
const TARGET_DATE = new Date().toISOString().split('T')[0]; // Today

async function fixDeliverySystemBugs() {
  console.log('🔧 Starting Delivery System Bug Fixes');
  console.log('='.repeat(60));
  console.log(`Target Date: ${TARGET_DATE}`);
  console.log(`Delivery Partner: ${DELIVERY_PARTNER_ID}`);
  
  try {
    // Step 1: Fix missing delivery partner order assignments
    console.log('\n1. Fixing missing delivery partner order assignments...');
    const fixResult = await DeliveryAPI.fixMissingDeliveryPartnerAssignments(TARGET_DATE);
    
    if (fixResult.success) {
      console.log(`✅ Fixed ${fixResult.fixed} missing assignments`);
    } else {
      console.error('❌ Failed to fix assignments:', fixResult.error);
    }

    // Step 2: Run auto-assignment to ensure all slots have delivery partners
    console.log('\n2. Running auto-assignment for delivery partners...');
    const autoAssignResult = await DeliveryAPI.autoAssignDeliveryPartners(TARGET_DATE);
    
    if (autoAssignResult.success) {
      console.log(`✅ Created ${autoAssignResult.assignments} new slot assignments`);
    } else {
      console.error('❌ Auto-assignment failed:', autoAssignResult.error);
    }

    // Step 3: Fix existing assignment issues
    console.log('\n3. Fixing existing assignment issues...');
    const fixExistingResult = await DeliveryAPI.fixExistingAssignments(TARGET_DATE);
    
    if (fixExistingResult.success) {
      console.log('✅ Fixed existing assignment issues');
    } else {
      console.error('❌ Failed to fix existing assignments:', fixExistingResult.error);
    }

    // Step 4: Test the delivery partner dashboard query
    console.log('\n4. Testing delivery partner dashboard...');
    const dashboardTest = await testDeliveryPartnerDashboard(DELIVERY_PARTNER_ID);
    
    if (dashboardTest.success) {
      console.log(`✅ Dashboard test passed - found ${dashboardTest.slotsCount} slots with ${dashboardTest.ordersCount} orders`);
    } else {
      console.error('❌ Dashboard test failed:', dashboardTest.error);
    }

    console.log('\n🎉 All fixes completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('💥 Fix script failed:', error);
  }
}

async function testDeliveryPartnerDashboard(deliveryPartnerId) {
  try {
    // This simulates the exact query from the dashboard
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'your-supabase-url',
      process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key'
    );

    // Get slot assignments
    const { data: slotData, error: slotError } = await supabase
      .from('delivery_assignments')
      .select(`
        *,
        delivery_slot:delivery_slots(*),
        sector:sectors(*)
      `)
      .eq('delivery_partner_id', deliveryPartnerId)
      .eq('assigned_date', TARGET_DATE)
      .in('status', ['assigned', 'active']);

    if (slotError) throw slotError;

    let totalOrders = 0;
    
    if (slotData && slotData.length > 0) {
      for (const assignment of slotData) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            order_status,
            delivery_partner_orders(delivery_partner_id)
          `)
          .eq('slot_id', assignment.slot_id)
          .eq('delivery_date', assignment.assigned_date);

        if (!ordersError && orders) {
          const assignedOrders = orders.filter(order => 
            order.delivery_partner_orders?.some(dpo => dpo.delivery_partner_id === deliveryPartnerId)
          );
          totalOrders += assignedOrders.length;
          
          console.log(`   📋 Slot ${assignment.delivery_slot?.slot_name}: ${assignedOrders.length}/${orders.length} orders assigned`);
        }
      }
    }

    return {
      success: true,
      slotsCount: slotData?.length || 0,
      ordersCount: totalOrders
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the fixes if this script is executed directly
if (typeof window === 'undefined') {
  fixDeliverySystemBugs();
}

export { fixDeliverySystemBugs }; 