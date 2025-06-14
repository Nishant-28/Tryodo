// Debug script to test vendor dashboard queries
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugVendorQueries() {
  console.log('🔍 Starting vendor dashboard debug...');
  
  try {
    // Test 1: List all vendors
    console.log('\n📊 Test 1: All vendors');
    const { data: allVendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*');
    
    console.log('Vendors found:', allVendors?.length || 0);
    if (vendorsError) console.error('Vendors error:', vendorsError);
    if (allVendors) {
      allVendors.forEach(vendor => {
        console.log(`- Vendor: ${vendor.business_name} (ID: ${vendor.id}, user_id: ${vendor.user_id})`);
      });
    }

    // Test 2: List all vendor products
    console.log('\n📱 Test 2: All vendor products');
    const { data: allVendorProducts, error: vendorProductsError } = await supabase
      .from('vendor_products')
      .select(`
        *,
        vendor:vendors(business_name),
        category:categories(name),
        quality_type:quality_categories(name),
        model:models(full_name, brand:brands(name))
      `);
    
    console.log('Vendor products found:', allVendorProducts?.length || 0);
    if (vendorProductsError) console.error('Vendor products error:', vendorProductsError);
    if (allVendorProducts) {
      allVendorProducts.forEach(product => {
        console.log(`- Product: ${product.model?.full_name || 'Unknown'} by ${product.vendor?.business_name} (vendor_id: ${product.vendor_id})`);
      });
    }

    // Test 3: List all vendor generic products
    console.log('\n🔧 Test 3: All vendor generic products');
    const { data: allGenericProducts, error: genericProductsError } = await supabase
      .from('vendor_generic_products')
      .select(`
        *,
        vendor:vendors(business_name),
        generic_product:generic_products(name),
        quality_type:quality_categories(name)
      `);
    
    console.log('Vendor generic products found:', allGenericProducts?.length || 0);
    if (genericProductsError) console.error('Generic products error:', genericProductsError);
    if (allGenericProducts) {
      allGenericProducts.forEach(product => {
        console.log(`- Generic Product: ${product.generic_product?.name || 'Unknown'} by ${product.vendor?.business_name} (vendor_id: ${product.vendor_id})`);
      });
    }

    // Test 4: List all profiles with vendor role
    console.log('\n👤 Test 4: All vendor profiles');
    const { data: vendorProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vendor');
    
    console.log('Vendor profiles found:', vendorProfiles?.length || 0);
    if (profilesError) console.error('Profiles error:', profilesError);
    if (vendorProfiles) {
      vendorProfiles.forEach(profile => {
        console.log(`- Profile: ${profile.email} (user_id: ${profile.user_id})`);
      });
    }

    // Test 5: Check relationship between profiles and vendors
    console.log('\n🔗 Test 5: Profile-Vendor relationships');
    if (vendorProfiles && allVendors) {
      vendorProfiles.forEach(profile => {
        const matchingVendor = allVendors.find(vendor => vendor.user_id === profile.user_id);
        if (matchingVendor) {
          console.log(`✅ Match: ${profile.email} -> ${matchingVendor.business_name}`);
        } else {
          console.log(`❌ No vendor for profile: ${profile.email} (user_id: ${profile.user_id})`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run if this file is executed directly
if (typeof window === 'undefined') {
  debugVendorQueries();
}

export { debugVendorQueries }; 