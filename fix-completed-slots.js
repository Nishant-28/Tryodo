// Script to fix completed slots that are still marked as active
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixCompletedSlots() {
  console.log('🔧 Starting cleanup of completed slots...')
  
  try {
    // Get all active assignments
    const { data: activeAssignments, error: assignmentsError } = await supabase
      .from('delivery_partner_sector_assignments')
      .select(`
        *,
        delivery_slot:delivery_slots(slot_name),
        sector:sectors(name)
      `)
      .eq('is_active', true)
      
    if (assignmentsError) {
      console.error('Error fetching active assignments:', assignmentsError)
      return
    }
    
    console.log(`📊 Found ${activeAssignments?.length || 0} active assignments to check`)
    
    let fixedCount = 0
    
    // Check each assignment
    for (const assignment of activeAssignments || []) {
      console.log(`\n🔍 Checking: ${assignment.delivery_slot?.slot_name} (${assignment.assigned_date})`)
      
      // Get all orders for this slot and date
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_status,
          delivery_partner_orders!inner(delivery_partner_id, status)
        `)
        .eq('slot_id', assignment.slot_id)
        .eq('delivery_date', assignment.assigned_date)
        .eq('delivery_partner_orders.delivery_partner_id', assignment.delivery_partner_id)
        
      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        continue
      }
      
      if (!orders || orders.length === 0) {
        console.log('⚠️ No orders found for this assignment')
        continue
      }
      
      // Check if all orders are delivered
      const totalOrders = orders.length
      const deliveredOrders = orders.filter(order => 
        order.order_status === 'delivered'
      ).length
      
      console.log(`📦 Orders: ${totalOrders} total, ${deliveredOrders} delivered`)
      
      // If all orders are delivered, mark assignment as completed
      if (deliveredOrders === totalOrders && totalOrders > 0) {
        console.log(`🎯 All orders delivered! Marking assignment as completed...`)
        
                 // Update sector assignment (only is_active field exists)
         const { error: updateSectorError } = await supabase
           .from('delivery_partner_sector_assignments')
           .update({ 
             is_active: false
           })
           .eq('id', assignment.id)
           
         // Also update legacy delivery assignments if they exist
         const { error: updateLegacyError } = await supabase
           .from('delivery_assignments')
           .update({ 
             status: 'completed'
           })
           .eq('delivery_partner_id', assignment.delivery_partner_id)
           .eq('slot_id', assignment.slot_id)
           .eq('assigned_date', assignment.assigned_date)
          
        if (updateSectorError) {
          console.error('Error updating sector assignment:', updateSectorError)
        } else if (updateLegacyError) {
          console.error('Error updating legacy assignment:', updateLegacyError)
        } else {
          console.log('✅ Successfully marked assignment as completed')
          fixedCount++
        }
      } else {
        console.log(`ℹ️ Assignment still active (${deliveredOrders}/${totalOrders} delivered)`)
      }
    }
    
    console.log(`\n🎉 Cleanup completed! Fixed ${fixedCount} assignments`)
    
    // Also check for any completed assignments that might need cleanup
    console.log('\n🔍 Checking for any other data inconsistencies...')
    
    // Check for orders marked as delivered but assignments still active
    const { data: deliveredOrdersWithActiveAssignments, error: deliveredError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_status,
        slot_id,
        delivery_date,
        delivery_partner_orders!inner(delivery_partner_id, status)
      `)
      .eq('order_status', 'delivered')
      .eq('delivery_partner_orders.status', 'delivered')
      
    if (deliveredError) {
      console.error('Error checking delivered orders:', deliveredError)
    } else {
      console.log(`📦 Found ${deliveredOrdersWithActiveAssignments?.length || 0} delivered orders`)
      
      // Group by slot and date to find slots that should be completed
      const slotGroups = {}
      
      for (const order of deliveredOrdersWithActiveAssignments || []) {
        const key = `${order.slot_id}-${order.delivery_date}-${order.delivery_partner_orders[0].delivery_partner_id}`
        if (!slotGroups[key]) {
          slotGroups[key] = {
            slot_id: order.slot_id,
            delivery_date: order.delivery_date,
            delivery_partner_id: order.delivery_partner_orders[0].delivery_partner_id,
            orders: []
          }
        }
        slotGroups[key].orders.push(order)
      }
      
      console.log(`📊 Found ${Object.keys(slotGroups).length} slot groups to verify`)
    }
    
  } catch (error) {
    console.error('💥 Error during cleanup:', error)
  }
}

// Run the cleanup
fixCompletedSlots().catch(console.error) 