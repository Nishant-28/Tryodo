import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oyvrgimwbtnurckftpck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnJnaW13YnRudXJja2Z0cGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzOTUzNTIsImV4cCI6MjA2Mzk3MTM1Mn0.Mv8RP83w4Bwjq-8LJqCF5OZg-0DvtAGJQ4J8xVInKWQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixDeliveryPartnerAssignments() {
  try {
    console.log('🔧 Fixing delivery partner assignment issues...');
    
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
    
    let totalAssignmentsFixed = 0;
    let totalPickupRecordsCreated = 0;
    
    for (const assignment of assignments) {
      console.log(`\n🎯 Processing assignment for delivery partner ${assignment.delivery_partner_id} in slot ${assignment.slot_id}...`);
      
      // Get orders for this slot
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          order_status,
          order_items(
            id,
            vendor_id
          )
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
      
      // Fix delivery partner orders assignments
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
            console.log(`✅ Created delivery partner assignment for order ${order.order_number}`);
            totalAssignmentsFixed++;
          }
        } else {
          console.log(`✅ Assignment already exists for order ${order.order_number}`);
        }
        
        // Fix order pickup records
        if (order.order_items && order.order_items.length > 0) {
          // Get unique vendor IDs from order items
          const vendorIds = [...new Set(order.order_items.map(item => item.vendor_id).filter(Boolean))];
          
          for (const vendorId of vendorIds) {
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
                console.error(`❌ Error creating pickup record for order ${order.order_number}, vendor ${vendorId}:`, pickupError.message);
              } else {
                console.log(`✅ Created pickup record for order ${order.order_number}, vendor ${vendorId}`);
                totalPickupRecordsCreated++;
              }
            }
          }
        }
      }
    }
    
    console.log(`\n🎉 Fix completed!`);
    console.log(`   📦 Created ${totalAssignmentsFixed} new delivery partner assignments`);
    console.log(`   🏪 Created ${totalPickupRecordsCreated} new pickup records`);
    
    // Now test if the dashboard query works
    console.log('\n🧪 Testing dashboard query...');
    
    const testSlotId = '7142aca2-e537-436b-9ad0-886675260c91';
    const testDate = '2025-07-08';
    
    const { data: testOrders, error: testError } = await supabase
      .from('orders')
      .select(`
        *,
        delivery_partner_orders!left(
          delivery_partner_id,
          status
        ),
        order_items(
          *,
          vendor_id
        ),
        customer_addresses(*),
        customers(
          profiles(full_name, phone)
        )
      `)
      .eq('slot_id', testSlotId)
      .eq('delivery_date', testDate);
      
    if (testError) {
      console.error('❌ Dashboard query still has errors:', testError);
    } else {
      console.log(`✅ Dashboard query successful! Found ${testOrders?.length || 0} orders`);
      
      // Check how many have delivery partner assignments
      const assignedOrders = testOrders?.filter(order => {
        if (Array.isArray(order.delivery_partner_orders)) {
          return order.delivery_partner_orders.length > 0;
        } else if (order.delivery_partner_orders) {
          return true;
        }
        return false;
      }) || [];
      
      console.log(`   📋 ${assignedOrders.length} orders have delivery partner assignments`);
    }
    
  } catch (error) {
    console.error('💥 Error in fixDeliveryPartnerAssignments:', error);
  }
}

// Run the fix
fixDeliveryPartnerAssignments(); 