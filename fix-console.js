// Browser console script to fix vendor pickup issue
// Copy and paste this into the browser console on the delivery dashboard

async function fixVendorPickupIssue() {
  const orderId = 'ebd39599-a5ed-437b-b581-70ab623060a5';
  const deliveryPartnerId = '747c1649-8331-4956-9fbe-bd19765e30a3';
  
  console.log('🔧 Fixing vendor pickup issue...');
  console.log('Order ID:', orderId);
  console.log('Delivery Partner ID:', deliveryPartnerId);
  
  try {
    // Import the DeliveryAPI if available
    if (typeof DeliveryAPI !== 'undefined') {
      console.log('Using DeliveryAPI.debugAndFixMissingAssignment...');
      const result = await DeliveryAPI.debugAndFixMissingAssignment(orderId, deliveryPartnerId);
      
      if (result.success) {
        console.log('✅ Fix successful:', result.message);
        console.log('🔄 Please refresh the page and try vendor pickup again');
      } else {
        console.error('❌ Fix failed:', result.error);
      }
    } else {
      console.log('DeliveryAPI not available, using direct Supabase...');
      
      // Use global supabase if available
      if (typeof supabase !== 'undefined') {
        // Check if assignment exists
        const { data: assignment, error: assignmentError } = await supabase
          .from('delivery_partner_orders')
          .select('*')
          .eq('order_id', orderId)
          .eq('delivery_partner_id', deliveryPartnerId)
          .maybeSingle();

        if (assignmentError) {
          console.error('❌ Error checking assignment:', assignmentError);
          return;
        }

        if (!assignment) {
          console.log('🔧 Creating missing assignment...');
          
          const { data: newAssignment, error: createError } = await supabase
            .from('delivery_partner_orders')
            .insert({
              delivery_partner_id: deliveryPartnerId,
              order_id: orderId,
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

          console.log('✅ Created assignment:', newAssignment.id);
          console.log('🔄 Please refresh the page and try vendor pickup again');
        } else {
          console.log('✅ Assignment already exists:', assignment.id);
          console.log('🤔 The issue might be something else. Check the console for other errors.');
        }
      } else {
        console.error('❌ Neither DeliveryAPI nor supabase is available in global scope');
        console.log('💡 Please run this script on the delivery dashboard page');
      }
    }
  } catch (error) {
    console.error('💥 Error during fix:', error);
  }
}

// Auto-run the fix
console.log('🚀 Starting vendor pickup fix...');
fixVendorPickupIssue(); 