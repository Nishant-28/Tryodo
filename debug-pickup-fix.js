// Debug script to test pickup record creation fix
import { DeliveryAPI } from './src/lib/deliveryApi.ts';

async function testPickupRecordCreation() {
  console.log('🧪 Testing pickup record creation fix...');
  
  const orderId = '89b232cd-17b6-4e09-8aac-44148555973f';
  const deliveryPartnerId = '747c1649-8331-4956-9fbe-bd19765e30a3';
  const vendorId = 'aa5c87ad-0072-4721-a77a-7b5af6997def';
  
  try {
    // Test the ensureOrderPickupRecords function
    console.log('📋 Step 1: Ensuring pickup records exist...');
    const ensureResult = await DeliveryAPI.ensureOrderPickupRecords(orderId, deliveryPartnerId);
    console.log('Ensure pickup records result:', ensureResult);
    
    // Test the markVendorPickedUp function 
    console.log('📋 Step 2: Testing vendor pickup...');
    const pickupResult = await DeliveryAPI.markVendorPickedUp(orderId, vendorId, deliveryPartnerId);
    console.log('Mark vendor picked up result:', pickupResult);
    
  } catch (error) {
    console.error('❌ Error testing pickup fix:', error);
  }
}

// Run the test
testPickupRecordCreation(); 