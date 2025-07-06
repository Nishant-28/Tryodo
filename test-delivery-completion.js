// Test script to verify delivery completion logic
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseAnonKey = 'your-anon-key'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDeliveryCompletion() {
  console.log('🧪 Testing delivery completion logic...')
  
  // Test 1: Check if there are any completed slots still showing in active assignments
  const { data: completedSlots, error: completedError } = await supabase
    .from('delivery_partner_sector_assignments')
    .select(`
      *,
      delivery_slot:delivery_slots(slot_name),
      sector:sectors(name)
    `)
    .eq('is_active', true)
    
  if (completedError) {
    console.error('Error checking completed slots:', completedError)
    return
  }
  
  console.log(`📊 Found ${completedSlots?.length || 0} active slot assignments`)
  
  // For each active assignment, check if all orders are delivered
  for (const assignment of completedSlots || []) {
    console.log(`\n🔍 Checking assignment: ${assignment.delivery_slot?.slot_name} (${assignment.assigned_date})`)
    
    // Get all orders for this slot
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_status,
        delivery_partner_orders(delivery_partner_id, status)
      `)
      .eq('slot_id', assignment.slot_id)
      .eq('delivery_date', assignment.assigned_date)
      
    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      continue
    }
    
    // Check delivery status
    const totalOrders = orders?.length || 0
    const deliveredOrders = orders?.filter(order => order.order_status === 'delivered').length || 0
    const partnerOrders = orders?.filter(order => 
      order.delivery_partner_orders?.some(dpo => 
        dpo.delivery_partner_id === assignment.delivery_partner_id && 
        dpo.status === 'delivered'
      )
    ).length || 0
    
    console.log(`📦 Orders: ${totalOrders} total, ${deliveredOrders} delivered, ${partnerOrders} partner delivered`)
    
    // If all orders are delivered, this assignment should be marked as completed
    if (totalOrders > 0 && deliveredOrders === totalOrders) {
      console.log(`❗ ISSUE FOUND: Assignment should be marked as completed but is still active`)
      console.log(`   Slot: ${assignment.delivery_slot?.slot_name}`)
      console.log(`   Date: ${assignment.assigned_date}`)
      console.log(`   Partner: ${assignment.delivery_partner_id}`)
      
      // Fix the assignment
      const { error: updateError } = await supabase
        .from('delivery_partner_sector_assignments')
        .update({ 
          is_active: false,
          completed_at: new Date().toISOString()
        })
        .eq('id', assignment.id)
        
      if (updateError) {
        console.error('Error fixing assignment:', updateError)
      } else {
        console.log('✅ Fixed assignment status')
      }
    } else if (totalOrders === 0) {
      console.log(`⚠️ No orders found for this assignment`)
    } else {
      console.log(`✅ Assignment is correctly active (${deliveredOrders}/${totalOrders} delivered)`)
    }
  }
  
  console.log('\n🎉 Test completed!')
}

// Run the test
testDeliveryCompletion().catch(console.error) 