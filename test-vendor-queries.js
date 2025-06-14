// Simple test script to debug vendor queries
// You can run this in browser console

async function testVendorQueries() {
  // This assumes you have supabase available globally
  // You can copy this into browser console on the vendor dashboard page
  
  console.log('🧪 Testing vendor queries...');
  
  try {
    // Test getting current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current user:', user);
    if (userError) console.error('User error:', userError);
    
    if (!user) {
      console.log('❌ No user logged in');
      return;
    }
    
    // Test getting all vendors
    const { data: allVendors, error: allVendorsError } = await supabase
      .from('vendors')
      .select('*');
    console.log('🏢 All vendors:', allVendors);
    if (allVendorsError) console.error('All vendors error:', allVendorsError);
    
    // Test getting vendor by user_id
    const { data: userVendor, error: userVendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', user.id);
    console.log('🔍 Vendor by user_id:', userVendor);
    if (userVendorError) console.error('User vendor error:', userVendorError);
    
    if (!userVendor || userVendor.length === 0) {
      console.log('❌ No vendor found for user_id:', user.id);
      console.log('💡 Available vendors:');
      allVendors?.forEach(v => {
        console.log(`  - ${v.business_name} (user_id: ${v.user_id}, id: ${v.id})`);
      });
      return;
    }
    
    const vendor = userVendor[0];
    console.log('✅ Found vendor:', vendor.business_name);
    
    // Test getting vendor products
    const { data: vendorProducts, error: vendorProductsError } = await supabase
      .from('vendor_products')
      .select('*')
      .eq('vendor_id', vendor.id);
    console.log('📱 Vendor products:', vendorProducts);
    if (vendorProductsError) console.error('Vendor products error:', vendorProductsError);
    
    // Test getting vendor generic products
    const { data: vendorGenericProducts, error: vendorGenericProductsError } = await supabase
      .from('vendor_generic_products')
      .select('*')
      .eq('vendor_id', vendor.id);
    console.log('🔧 Vendor generic products:', vendorGenericProducts);
    if (vendorGenericProductsError) console.error('Vendor generic products error:', vendorGenericProductsError);
    
    console.log('📊 Summary:');
    console.log(`  - User ID: ${user.id}`);
    console.log(`  - Vendor ID: ${vendor.id}`);
    console.log(`  - Phone products: ${vendorProducts?.length || 0}`);
    console.log(`  - Generic products: ${vendorGenericProducts?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Auto-run if window.supabase is available
if (typeof window !== 'undefined' && window.supabase) {
  console.log('🚀 Running vendor query test...');
  testVendorQueries();
} else {
  console.log('📝 Copy and paste this into browser console on the vendor dashboard page:');
  console.log('testVendorQueries()');
}

// Make function globally available
if (typeof window !== 'undefined') {
  window.testVendorQueries = testVendorQueries;
} 