import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cfqpnpfqbjsupykthtmz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmcXBucGZxYmpzdXB5a3RodG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4MjMwOTgsImV4cCI6MjA0OTM5OTA5OH0.rWKRJ9nRh2MjLJJOyLa2IIpJZKmvkKl1Ep-N4hgQOts';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVendorTableFix() {
  console.log('🔍 Testing vendors table access...');
  
  try {
    // Test 1: Basic vendors table access
    console.log('\n1. Testing basic vendors table access...');
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*');
    
    if (vendorsError) {
      console.error('❌ Error accessing vendors table:', vendorsError);
      return;
    }
    
    console.log('✅ Vendors table accessible. Found', vendors?.length || 0, 'vendors');
    vendors?.forEach(vendor => {
      console.log(`  - ${vendor.business_name} (profile_id: ${vendor.profile_id})`);
    });
    
    // Test 2: Check profiles table
    console.log('\n2. Testing profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Error accessing profiles table:', profilesError);
      return;
    }
    
    console.log('✅ Profiles table accessible. Found', profiles?.length || 0, 'profiles');
    profiles?.forEach(profile => {
      console.log(`  - ${profile.email} (role: ${profile.role}, id: ${profile.id})`);
    });
    
    // Test 3: Test relationship through a manual join
    console.log('\n3. Testing manual join of vendors and profiles...');
    const { data: vendorsWithProfiles, error: joinError } = await supabase
      .from('vendors')
      .select(`
        *,
        profile:profiles!vendors_profile_id_fkey(
          user_id,
          email,
          role
        )
      `);
    
    if (joinError) {
      console.error('❌ Join error:', joinError);
      console.log('This is expected if foreign key relationships are not properly cached.');
    } else {
      console.log('✅ Join successful! Found', vendorsWithProfiles?.length || 0, 'vendors with profile data');
      vendorsWithProfiles?.forEach(vendor => {
        console.log(`  - ${vendor.business_name} -> ${vendor.profile?.email || 'No profile'}`);
      });
    }
    
    // Test 4: Test simplified query that should work
    console.log('\n4. Testing simplified vendor lookup by profile_id...');
    
    // Get a sample profile ID
    if (profiles && profiles.length > 0) {
      const sampleProfile = profiles.find(p => p.role === 'vendor');
      if (sampleProfile) {
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('profile_id', sampleProfile.id);
        
        if (vendorError) {
          console.error('❌ Error in vendor lookup:', vendorError);
        } else {
          console.log(`✅ Vendor lookup successful for profile ${sampleProfile.email}:`, vendorData?.length || 0, 'vendors found');
          vendorData?.forEach(vendor => {
            console.log(`  - Found vendor: ${vendor.business_name}`);
          });
        }
      } else {
        console.log('⚠️ No vendor profiles found to test with');
      }
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testVendorTableFix(); 