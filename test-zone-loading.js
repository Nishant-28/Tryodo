// Simple test script to verify delivery zones loading
// Run this in browser console to test zone loading

async function testZoneLoading() {
  console.log('🔍 Testing delivery zones loading from frontend...');
  
  try {
    // Import supabase client (this assumes you have it available globally)
    const { createClient } = window.supabase || require('@supabase/supabase-js');
    
    // You'll need to replace these with your actual Supabase credentials
    const supabaseUrl = 'YOUR_SUPABASE_URL';
    const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Check if table exists and count rows
    console.log('\n1. Checking delivery_zones table...');
    const { count, error: countError } = await supabase
      .from('delivery_zones')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error checking table:', countError);
      return;
    }
    
    console.log(`✅ Found ${count} delivery zones in database`);
    
    // Test 2: Load actual data
    console.log('\n2. Loading zone data...');
    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ Error loading zones:', error);
      return;
    }
    
    console.log('✅ Zones loaded successfully:');
    zones.forEach(zone => {
      console.log(`  - ${zone.name}: ${zone.pincodes.join(', ')} (${zone.is_active ? 'Active' : 'Inactive'})`);
    });
    
    // Test 3: Check active zones only
    console.log('\n3. Checking active zones...');
    const activeZones = zones.filter(zone => zone.is_active);
    console.log(`✅ Found ${activeZones.length} active zones`);
    
    return {
      success: true,
      totalZones: zones.length,
      activeZones: activeZones.length,
      zones: zones
    };
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
console.log('To test zone loading, run: testZoneLoading()');

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testZoneLoading };
} 