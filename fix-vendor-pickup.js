// Fix script for vendor pickup assignment issue
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kjuiyjpkjkogwjacgpjm.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqdWl5anBranMrZ3dqYWNncGptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjY0NTA4MSwiZXhwIjoyMDQ4MjIxMDgxfQ.5Lv2LlnzRzEu7Zy4W9SbKhM2MZR1z7K3w2NkU5R7u1Y';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// The specific order that's failing
const FAILING_ORDER_ID = 'ebd39599-a5ed-437b-b581-70ab623060a5';
const DELIVERY_PARTNER_ID = '747c1649-8331-4956-9fbe-bd19765e30a3';

async function fixVendorPickupIssue() {
  console.log('🔧 Fixing Vendor Pickup Assignment Issue');
  console.log('='.repeat(50));
  console.log(`📦 Order ID: ${FAILING_ORDER_ID}`);
  console.log(`🚚 Delivery Partner ID: ${DELIVERY_PARTNER_ID}`);

  try {
    // 1. Check current state
    console.log('\n1. Checking current assignment state...');
    const { data: assignment, error: assignmentError } = await supabase
      .from('delivery_partner_orders')
      .select('*')
      .eq('order_id', FAILING_ORDER_ID)
      .eq('delivery_partner_id', DELIVERY_PARTNER_ID)
      .maybeSingle();

    if (assignmentError) {
      console.error('❌ Error checking assignment:', assignmentError);
      return;
    }

    if (!assignment) {
      console.log('❌ Missing delivery_partner_orders record - this is the root cause!');
      
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('order_status, slot_id, delivery_date, order_number')
        .eq('id', FAILING_ORDER_ID)
        .single();

      if (orderError) {
        console.error('❌ Error fetching order:', orderError);
        return;
      }

      console.log(`📋 Order ${order.order_number} (${order.order_status})`);

      // Create the missing assignment
      console.log('\n🔧 Creating missing delivery_partner_orders record...');
      const { data: newAssignment, error: createError } = await supabase
        .from('delivery_partner_orders')
        .insert({
          delivery_partner_id: DELIVERY_PARTNER_ID,
          order_id: FAILING_ORDER_ID,
          status: 'assigned',
          assigned_at: new Date().toISOString(),
          accepted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating assignment:', createError);
        return;
      }

      console.log('✅ Created delivery_partner_orders record:', newAssignment.id);
    } else {
      console.log('✅ Assignment already exists:', assignment.id);
    }

    // 2. Check pickup records
    console.log('\n2. Ensuring pickup records exist...');
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('vendor_id')
      .eq('order_id', FAILING_ORDER_ID);

    if (itemsError) {
      console.error('❌ Error fetching order items:', itemsError);
      return;
    }

    const uniqueVendors = [...new Set(orderItems?.map(item => item.vendor_id) || [])];
    console.log(`🏪 Found ${uniqueVendors.length} vendors in order`);

    for (const vendorId of uniqueVendors) {
      const { data: existingPickup } = await supabase
        .from('order_pickups')
        .select('id, pickup_status')
        .eq('order_id', FAILING_ORDER_ID)
        .eq('vendor_id', vendorId)
        .eq('delivery_partner_id', DELIVERY_PARTNER_ID)
        .maybeSingle();

      if (!existingPickup) {
        console.log(`🔧 Creating pickup record for vendor: ${vendorId}`);
        
        const { error: pickupError } = await supabase
          .from('order_pickups')
          .insert({
            order_id: FAILING_ORDER_ID,
            vendor_id: vendorId,
            delivery_partner_id: DELIVERY_PARTNER_ID,
            pickup_status: 'pending'
          });

        if (pickupError) {
          console.error(`❌ Error creating pickup record:`, pickupError);
        } else {
          console.log(`✅ Created pickup record for vendor ${vendorId}`);
        }
      } else {
        console.log(`✅ Pickup record exists for vendor ${vendorId} (${existingPickup.pickup_status})`);
      }
    }

    console.log('\n🎉 Fix completed successfully!');
    console.log('💡 The vendor pickup should now work in the dashboard.');

  } catch (error) {
    console.error('💥 Error during fix:', error);
  }
}

// Also fix any other missing assignments for today
async function fixAllMissingAssignmentsToday() {
  console.log('\n🔧 Fixing all missing assignments for today...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get active delivery partner assignments
    const { data: assignments, error: assignError } = await supabase
      .from('delivery_partner_sector_assignments')
      .select('delivery_partner_id, slot_id, assigned_date')
      .eq('assigned_date', today)
      .eq('is_active', true);
    
    if (assignError) {
      console.error('❌ Error fetching assignments:', assignError);
      return;
    }
    
    console.log(`📋 Found ${assignments?.length || 0} delivery partner assignments`);
    
    let totalFixed = 0;
    
    for (const assignment of assignments || []) {
      // Get orders for this slot
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('slot_id', assignment.slot_id)
        .eq('delivery_date', assignment.assigned_date);
        
      if (ordersError) continue;
      
      for (const order of orders || []) {
        // Check if delivery_partner_orders record exists
        const { data: existing } = await supabase
          .from('delivery_partner_orders')
          .select('id')
          .eq('order_id', order.id)
          .eq('delivery_partner_id', assignment.delivery_partner_id)
          .maybeSingle();
          
        if (!existing) {
          const { error: insertError } = await supabase
            .from('delivery_partner_orders')
            .insert({
              delivery_partner_id: assignment.delivery_partner_id,
              order_id: order.id,
              status: 'assigned',
              assigned_at: new Date().toISOString(),
              accepted_at: new Date().toISOString()
            });
            
          if (!insertError) {
            console.log(`✅ Fixed assignment for order ${order.order_number}`);
            totalFixed++;
          }
        }
      }
    }
    
    console.log(`🎉 Fixed ${totalFixed} missing assignments for today`);
    
  } catch (error) {
    console.error('💥 Error in general fix:', error);
  }
}

// Run the fixes
async function runFixes() {
  await fixVendorPickupIssue();
  await fixAllMissingAssignmentsToday();
}

runFixes(); 