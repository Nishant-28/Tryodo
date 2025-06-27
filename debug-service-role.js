// Debug Service Role Configuration
// Run this in browser console to debug the vendor approval issue

console.log('🔧 Debug: Service Role Configuration');

// Check environment variables
const envCheck = {
  hasViteServiceRoleKey: !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  hasRegularServiceRoleKey: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  hasViteUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasViteAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
};

console.log('1️⃣ Environment Variables:', envCheck);

// Check if service role client is available
import('./src/lib/supabase.js').then(({ supabaseServiceRole }) => {
  console.log('2️⃣ Service Role Client Available:', !!supabaseServiceRole);

  if (supabaseServiceRole) {
    console.log('3️⃣ Service Role Client Details:', {
      hasClient: !!supabaseServiceRole,
      clientType: typeof supabaseServiceRole,
      hasFrom: typeof supabaseServiceRole.from === 'function'
    });
    
    // Test a simple query with service role
    const testServiceRole = async () => {
      try {
        console.log('4️⃣ Testing service role query...');
        
        const { data, error } = await supabaseServiceRole
          .from('vendors')
          .select('id, business_name, is_verified')
          .limit(1);
        
        console.log('📊 Service role query result:', { 
          success: !error, 
          data, 
          error: error?.message 
        });
        
        if (data && data.length > 0) {
          const vendorId = data[0].id;
          console.log('5️⃣ Testing vendor update...');
          
          // Test updating a vendor
          const { data: updateData, error: updateError } = await supabaseServiceRole
            .from('vendors')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', vendorId)
            .select('*')
            .single();
          
          console.log('📝 Update test result:', {
            success: !updateError,
            data: updateData,
            error: updateError?.message
          });
        }
      } catch (err) {
        console.error('❌ Service role test failed:', err);
      }
    };
    
    testServiceRole();
  } else {
    console.error('❌ Service role client not available');
  }
});
