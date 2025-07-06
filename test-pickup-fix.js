// Test script to validate the delivery partner pickup bug fix
// This script can be run to test if the fix is working properly

import { DeliveryAPI } from './src/lib/deliveryApi.js';

const TEST_ORDER_ID = '89b232cd-17b6-4e09-8aac-44148555973f';
const TEST_VENDOR_ID = 'aa5c87ad-0072-4721-a77a-7b5af6997def';
const TEST_DELIVERY_PARTNER_ID = '747c1649-8331-4956-9fbe-bd19765e30a3';

async function testPickupBugFix() {
  console.log('🧪 Testing Delivery Partner Pickup Bug Fix');
  console.log('='.repeat(50));

  try {
    // 1. Diagnose the test order pickup status
    console.log('\n1. Diagnosing test order pickup status...');
    const pickupDiagnosis = await DeliveryAPI.diagnoseOrderPickupStatus(TEST_ORDER_ID);
    
    if (pickupDiagnosis.success) {
      console.log('📊 Pickup Diagnosis Results:');
      console.log('  - Order:', pickupDiagnosis.data.order.order_number);
      console.log('  - Order Status:', pickupDiagnosis.data.order.status);
      console.log('  - Assignment Status:', pickupDiagnosis.data.assignment?.status);
      console.log('  - Pickup Records:', pickupDiagnosis.data.pickup_records?.total || 0);
      console.log('  - Issues:', pickupDiagnosis.data.issues?.length || 0);
      
      if (pickupDiagnosis.data.issues?.length > 0) {
        console.log('  - Issue Details:', pickupDiagnosis.data.issues);
      }
    } else {
      console.error('❌ Failed to diagnose pickup status:', pickupDiagnosis.error);
    }

    // 2. Diagnose the test order delivery readiness  
    console.log('\n2. Diagnosing test order delivery readiness...');
    const deliveryDiagnosis = await DeliveryAPI.diagnoseOrderDeliveryReadiness(TEST_ORDER_ID);
    
    if (deliveryDiagnosis.success) {
      console.log('📊 Delivery Readiness Results:');
      console.log('  - Order:', deliveryDiagnosis.data.order.number);
      console.log('  - Order Status:', deliveryDiagnosis.data.order.status);
      console.log('  - Ready for Delivery:', deliveryDiagnosis.data.ready_for_delivery);
      console.log('  - Pickup Records:', deliveryDiagnosis.data.pickup_records.total);
      console.log('  - All Picked Up:', deliveryDiagnosis.data.pickup_records.all_picked_up);
      console.log('  - Delivery Records:', deliveryDiagnosis.data.delivery_records.total);
      console.log('  - Issues:', deliveryDiagnosis.data.issues.length);
      
      if (deliveryDiagnosis.data.issues.length > 0) {
        console.log('  - Issue Details:', deliveryDiagnosis.data.issues);
      }
    } else {
      console.error('❌ Failed to diagnose delivery readiness:', deliveryDiagnosis.error);
    }

    // 3. Test ensuring pickup records exist
    console.log('\n3. Testing pickup record creation...');
    const pickupRecordResult = await DeliveryAPI.ensureOrderPickupRecords(TEST_ORDER_ID, TEST_DELIVERY_PARTNER_ID);
    
    if (pickupRecordResult.success) {
      console.log('✅ Pickup records ensured successfully');
      console.log('  - Records created:', pickupRecordResult.data?.created || 0);
      console.log('  - Vendor IDs:', pickupRecordResult.data?.vendorIds || []);
    } else {
      console.error('❌ Failed to ensure pickup records:', pickupRecordResult.error);
    }

    // 4. Test vendor pickup functionality (if needed)
    console.log('\n4. Testing vendor pickup...');
    const vendorPickupResult = await DeliveryAPI.markVendorPickedUp(TEST_ORDER_ID, TEST_VENDOR_ID, TEST_DELIVERY_PARTNER_ID);
    
    if (vendorPickupResult.success) {
      console.log('✅ Vendor pickup test successful');
      
      if (vendorPickupResult.data?.alreadyPickedUp) {
        console.log('  - Status: Already picked up');
      } else {
        console.log('  - Status: Newly marked as picked up');
      }
    } else {
      console.error('❌ Vendor pickup test failed:', vendorPickupResult.error);
    }

    // 5. Re-diagnose after fixes
    console.log('\n5. Re-diagnosing after potential fixes...');
    const finalPickupDiagnosis = await DeliveryAPI.diagnoseOrderPickupStatus(TEST_ORDER_ID);
    const finalDeliveryDiagnosis = await DeliveryAPI.diagnoseOrderDeliveryReadiness(TEST_ORDER_ID);
    
    if (finalPickupDiagnosis.success && finalDeliveryDiagnosis.success) {
      console.log('📊 Final Status:');
      console.log('  - Pickup Issues:', finalPickupDiagnosis.data.issues?.length || 0);
      console.log('  - Delivery Issues:', finalDeliveryDiagnosis.data.issues?.length || 0);
      console.log('  - Ready for Delivery:', finalDeliveryDiagnosis.data.ready_for_delivery);
    }

    console.log('\n🎯 Test completed!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

async function testFixExistingAssignments() {
  console.log('\n🔧 Testing fixExistingAssignments function...');
  
  const today = new Date().toISOString().split('T')[0];
  const fixResult = await DeliveryAPI.fixExistingAssignments(today);
  
  if (fixResult.success) {
    console.log('✅ Fix existing assignments result:', fixResult.message);
    if (fixResult.data?.fixedRecords) {
      console.log(`  - Fixed ${fixResult.data.fixedRecords} pickup records`);
    }
  } else {
    console.error('❌ Failed to fix existing assignments:', fixResult.error);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Pickup Bug Fix Validation Tests');
  console.log('Time:', new Date().toISOString());
  console.log('='.repeat(60));

  // Test 1: Individual order testing
  await testPickupBugFix();

  // Test 2: Bulk fix testing
  await testFixExistingAssignments();

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
}

// Export for use in other modules
export { testPickupBugFix, testFixExistingAssignments, runTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
} 