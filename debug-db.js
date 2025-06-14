// Quick debug script to test database connectivity and setup
// Run with: node debug-db.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('🔍 Debugging Database Setup...\n');

  try {
    // Check categories
    console.log('1. Checking categories...');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);
    
    if (catError) {
      console.error('❌ Categories error:', catError);
    } else {
      console.log('✅ Categories found:', categories.length);
      categories.forEach(cat => console.log(`   - ${cat.name}`));
    }

    // Check quality categories
    console.log('\n2. Checking quality categories...');
    const { data: qualityTypes, error: qualityError } = await supabase
      .from('quality_categories')
      .select('*, categories!inner(name)')
      .limit(10);
    
    if (qualityError) {
      console.error('❌ Quality categories error:', qualityError);
    } else {
      console.log('✅ Quality categories found:', qualityTypes.length);
      qualityTypes.forEach(qt => console.log(`   - ${qt.name} (${qt.categories?.name})`));
    }

    // Check brands
    console.log('\n3. Checking brands...');
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('*')
      .limit(5);
    
    if (brandsError) {
      console.error('❌ Brands error:', brandsError);
    } else {
      console.log('✅ Brands found:', brands.length);
      brands.forEach(brand => console.log(`   - ${brand.name}`));
    }

    // Check smartphone models
    console.log('\n4. Checking smartphone models...');
    const { data: models, error: modelsError } = await supabase
      .from('smartphone_models')
      .select('*, brands!inner(name)')
      .limit(5);
    
    if (modelsError) {
      console.error('❌ Models error:', modelsError);
    } else {
      console.log('✅ Models found:', models.length);
      models.forEach(model => console.log(`   - ${model.model_name} (${model.brands?.name})`));
    }

    // Check vendors
    console.log('\n5. Checking vendors...');
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*');
    
    if (vendorsError) {
      console.error('❌ Vendors error:', vendorsError);
    } else {
      console.log('✅ Vendors found:', vendors.length);
      vendors.forEach(vendor => console.log(`   - ${vendor.business_name} (${vendor.id})`));
    }

    // Check profiles
    console.log('\n6. Checking profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Profiles error:', profilesError);
    } else {
      console.log('✅ Profiles found:', profiles.length);
      profiles.forEach(profile => console.log(`   - ${profile.email} (${profile.role})`));
    }

    // Test auth
    console.log('\n7. Testing current auth...');
    const { data: user, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Not authenticated:', authError.message);
    } else if (user?.user) {
      console.log('✅ Authenticated as:', user.user.email);
    } else {
      console.log('ℹ️ No authenticated user');
    }

    console.log('\n🎉 Database check completed!');

  } catch (error) {
    console.error('💥 Error during database check:', error);
  }
}

debugDatabase(); 