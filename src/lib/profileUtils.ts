import { supabase } from './supabase';
import type { UserRole } from '../contexts/AuthContext';

export const createMissingProfile = async (
  userId: string,
  email: string,
  role: UserRole,
  fullName?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔧 Creating missing profile for user:', userId);

    // First check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      console.log('✅ Profile already exists');
      return { success: true };
    }

    // Create the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        email: email,
        role: role,
        full_name: fullName || null
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return { success: false, error: profileError.message };
    }

    console.log('✅ Profile created successfully:', profile.id);

    // Create role-specific records
    await createRoleSpecificRecords(profile.id, role);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Unexpected error creating profile:', error);
    return { success: false, error: error.message };
  }
};

const createRoleSpecificRecords = async (profileId: string, role: UserRole) => {
  try {
    switch (role) {
      case 'customer':
        const { error: customerError } = await supabase
          .from('customers')
          .insert({ profile_id: profileId });
        
        if (customerError && !customerError.message.includes('duplicate key')) {
          console.error('❌ Error creating customer record:', customerError);
        } else {
          console.log('✅ Customer record created');
        }
        break;

      case 'vendor':
        const { error: vendorError } = await supabase
          .from('vendors')
          .insert({ 
            profile_id: profileId,
            business_name: 'New Business'
          });
        
        if (vendorError && !vendorError.message.includes('duplicate key')) {
          console.error('❌ Error creating vendor record:', vendorError);
        } else {
          console.log('✅ Vendor record created');
        }
        break;

      case 'delivery_partner':
        const timestamp = Date.now();
        const { error: deliveryError } = await supabase
          .from('delivery_partners')
          .insert({
            profile_id: profileId,
            license_number: `TEMP-${timestamp}`,
            vehicle_type: 'bike',
            vehicle_number: `TEMP-${timestamp}`,
            aadhar_number: `TEMP-${timestamp}`
          });
        
        if (deliveryError && !deliveryError.message.includes('duplicate key')) {
          console.error('❌ Error creating delivery partner record:', deliveryError);
        } else {
          console.log('✅ Delivery partner record created');
        }
        break;

      case 'admin':
        // Admin doesn't need additional tables
        console.log('✅ Admin role - no additional records needed');
        break;
    }
  } catch (error) {
    console.error('❌ Error creating role-specific records:', error);
  }
}; 