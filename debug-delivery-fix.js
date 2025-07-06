// Debug script to diagnose why orders are not showing in delivery section
import { DeliveryAPI } from './src/lib/deliveryApi.ts';

const TEST_ORDER_ID = '89b232cd-17b6-4e09-8aac-44148555973f';
const TEST_DELIVERY_PARTNER_ID = '747c1649-8331-4956-9fbe-bd19765e30a3';

async function debugDeliveryIssue() {
  console.log('🔍 Debugging Delivery Section Issue');
  console.log('='.repeat(50));

  try {
    // 1. Check the current state of the test order
    console.log('\n1. Current Order Analysis...');
    const deliveryDiagnosis = await DeliveryAPI.diagnoseOrderDeliveryReadiness(TEST_ORDER_ID);
    
    if (deliveryDiagnosis.success) {
      const data = deliveryDiagnosis.data;
      console.log('📊 Order Status:');
      console.log('  - Order Number:', data.order.number);
      console.log('  - Order Status:', data.order.status);
      console.log('  - Total Amount: ₹', data.order.total_amount);
      console.log('  - Assignment Status:', data.assignment?.status || 'NOT ASSIGNED');
      console.log('  - Picked Up At:', data.assignment?.picked_up_at || 'NOT PICKED UP');
      
      console.log('\n📦 Pickup Records:');
      console.log('  - Total Records:', data.pickup_records.total);
      console.log('  - All Picked Up:', data.pickup_records.all_picked_up);
      
      if (data.pickup_records.records.length > 0) {
        data.pickup_records.records.forEach((record, index) => {
          console.log(`    ${index + 1}. Vendor: ${record.vendor_id}, Status: ${record.pickup_status}`);
        });
      }
      
      console.log('\n🚚 Delivery Records:');
      console.log('  - Total Records:', data.delivery_records.total);
      
      if (data.delivery_records.records.length > 0) {
        data.delivery_records.records.forEach((record, index) => {
          console.log(`    ${index + 1}. Status: ${record.delivery_status}, Partner: ${record.delivery_partner_id}`);
        });
      }
      
      console.log('\n🎯 Delivery Readiness:');
      console.log('  - Ready for Delivery:', data.ready_for_delivery ? '✅ YES' : '❌ NO');
      console.log('  - Should Show in Dashboard:', (data.order.status === 'picked_up' || data.order.status === 'out_for_delivery') ? '✅ YES' : '❌ NO');
      
      console.log('\n⚠️ Issues Found:');
      if (data.issues.length === 0) {
        console.log('  - No issues detected');
      } else {
        data.issues.forEach((issue, index) => {
          console.log(`    ${index + 1}. ${issue}`);
        });
      }
      
      // 2. Check if we need to create delivery records
      if (data.order.status === 'picked_up' && data.delivery_records.total === 0) {
        console.log('\n2. Creating missing delivery record...');
        const deliveryRecordResult = await DeliveryAPI.ensureOrderDeliveryRecord(TEST_ORDER_ID, TEST_DELIVERY_PARTNER_ID);
        
        if (deliveryRecordResult.success) {
          console.log('✅ Delivery record created successfully');
        } else {
          console.error('❌ Failed to create delivery record:', deliveryRecordResult.error);
        }
      }
      
      // 3. Re-check after potential fixes
      console.log('\n3. Re-checking after fixes...');
      const finalDiagnosis = await DeliveryAPI.diagnoseOrderDeliveryReadiness(TEST_ORDER_ID);
      
      if (finalDiagnosis.success) {
        const finalData = finalDiagnosis.data;
        console.log('📊 Final Status:');
        console.log('  - Order Status:', finalData.order.status);
        console.log('  - Ready for Delivery:', finalData.ready_for_delivery);
        console.log('  - Delivery Records:', finalData.delivery_records.total);
        console.log('  - Issues Remaining:', finalData.issues.length);
        
        if (finalData.issues.length > 0) {
          console.log('  - Remaining Issues:', finalData.issues);
        }
      }
      
    } else {
      console.error('❌ Failed to diagnose order:', deliveryDiagnosis.error);
    }

    console.log('\n🎯 Debug completed!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('💥 Debug failed with error:', error);
  }
}

// Run the debug if this script is executed directly
if (typeof window === 'undefined') {
  debugDeliveryIssue();
}

export { debugDeliveryIssue }; 