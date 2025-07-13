#!/usr/bin/env node

// Fix script for delivery partner assignment issues
// This script addresses the main bugs in the slot-based delivery system

import { DeliveryAPI } from './src/lib/deliveryApi.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjuiyjpkjkogwjacgpjm.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqdWl5anBranMrZ3dqYWNncGptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjY0NTA4MSwiZXhwIjoyMDQ4MjIxMDgxfQ.5Lv2LlnzRzEu7Zy4W9SbKhM2MZR1z7K3w2NkU5R7u1Y';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Set global supabase for the API
global.supabase = supabase;

const TARGET_DATE = new Date().toISOString().split('T')[0];
const DELIVERY_PARTNER_ID = '747c1649-8331-4956-9fbe-bd19765e30a3'; // Test delivery partner

console.log('🔧 Delivery Assignment Fix Script');
console.log('='.repeat(60));
console.log(`📅 Target Date: ${TARGET_DATE}`);
console.log(`🚚 Test Delivery Partner: ${DELIVERY_PARTNER_ID}`);

async function fixDeliverySystemBugs() {
  console.log('\n🚀 Starting delivery system fixes...');
  
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

    // Step 5: Run additional fixes
    console.log('\n5. Running additional assignment fixes...');
    await fixMissingAssignments();

    console.log('\n🎉 All fixes completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('💥 Fix script failed:', error);
  }
}

async function testDeliveryPartnerDashboard(deliveryPartnerId) {
  try {
    // This simulates the exact query from the dashboard
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

async function fixMissingAssignments() {
  try {
    console.log('🔧 Creating missing delivery partner order assignments...');
    
    // Get all delivery partner sector assignments for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: assignments, error: assignError } = await supabase
      .from('delivery_partner_sector_assignments')
      .select(`
        delivery_partner_id,
        slot_id,
        assigned_date,
        sector_id
      `)
      .eq('assigned_date', today)
      .eq('is_active', true);
    
    if (assignError) {
      console.error('❌ Error fetching assignments:', assignError);
      return;
    }
    
    console.log(`📋 Found ${assignments?.length || 0} delivery partner assignments for today`);
    
    if (!assignments || assignments.length === 0) {
      console.log('No assignments to process');
      return;
    }
    
    let totalFixed = 0;
    let pickupRecordsCreated = 0;
    
    for (const assignment of assignments) {
      console.log(`\n🎯 Processing assignment for slot ${assignment.slot_id}...`);
      
      // Get orders for this slot
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          order_status,
          order_items(vendor_id)
        `)
        .eq('slot_id', assignment.slot_id)
        .eq('delivery_date', assignment.assigned_date);
        
      if (ordersError) {
        console.error('❌ Error fetching orders:', ordersError);
        continue;
      }
      
      console.log(`📦 Found ${orders?.length || 0} orders in slot`);
      
      if (!orders || orders.length === 0) {
        console.log('No orders in this slot');
        continue;
      }
      
      for (const order of orders) {
        // Check if delivery_partner_orders record already exists
        const { data: existing } = await supabase
          .from('delivery_partner_orders')
          .select('id')
          .eq('order_id', order.id)
          .eq('delivery_partner_id', assignment.delivery_partner_id)
          .maybeSingle();
          
        if (!existing) {
          // Create the delivery partner order assignment
          const { error: insertError } = await supabase
            .from('delivery_partner_orders')
            .insert({
              delivery_partner_id: assignment.delivery_partner_id,
              order_id: order.id,
              status: 'assigned',
              assigned_at: new Date().toISOString(),
              accepted_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`❌ Error creating assignment for ${order.order_number}:`, insertError.message);
          } else {
            console.log(`✅ Created assignment for order ${order.order_number}`);
            totalFixed++;
          }
        } else {
          console.log(`✅ Assignment already exists for order ${order.order_number}`);
        }

        // Also ensure pickup records exist for each vendor in this order
        if (order.order_items && order.order_items.length > 0) {
          const uniqueVendors = [...new Set(order.order_items.map(item => item.vendor_id))];
          
          for (const vendorId of uniqueVendors) {
            if (vendorId) {
              // Check if order_pickups record exists
              const { data: existingPickup } = await supabase
                .from('order_pickups')
                .select('id')
                .eq('order_id', order.id)
                .eq('vendor_id', vendorId)
                .maybeSingle();
                
              if (!existingPickup) {
                // Create order pickup record
                const { error: pickupError } = await supabase
                  .from('order_pickups')
                  .insert({
                    order_id: order.id,
                    vendor_id: vendorId,
                    delivery_partner_id: assignment.delivery_partner_id,
                    pickup_status: 'pending'
                  });
                  
                if (pickupError) {
                  console.error(`❌ Error creating pickup record for order ${order.order_number}:`, pickupError.message);
                } else {
                  console.log(`✅ Created pickup record for order ${order.order_number}, vendor ${vendorId}`);
                  pickupRecordsCreated++;
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`\n🎉 Assignment fix completed! Created ${totalFixed} assignments and ${pickupRecordsCreated} pickup records.`);
    
  } catch (error) {
    console.error('💥 Error in fixMissingAssignments:', error);
  }
}

// Run the fixes
fixDeliverySystemBugs(); 