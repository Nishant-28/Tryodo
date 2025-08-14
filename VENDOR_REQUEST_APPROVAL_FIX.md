# Vendor Request Approval Fix

## Issue
When admins tried to approve vendor requests by clicking "Review Vendor Request" → "Approve", the system was throwing a foreign key constraint violation error:

```
Error updating request: 
Object { code: "23503", details: 'Key (reviewed_by)=(2077535a-faa2-4523-a001-e9f683913e8d) is not present in table "profiles".', hint: null, message: 'insert or update on table "market_vendor_product_requests" violates foreign key constraint "market_vendor_product_requests_reviewed_by_fkey"' }
```

## Root Cause
The `market_vendor_product_requests` table has a foreign key constraint:
```sql
reviewed_by UUID REFERENCES profiles(id)
```

However, the code was using `user.id` (auth user ID) instead of `profile.id` for the `reviewed_by` field. The admin user had an auth record but no corresponding profile record in the `profiles` table.

## Fix Applied
Modified `src/pages/AdminVendorRequests.tsx` in the `handleReviewRequest` function:

### Before:
```typescript
const { data: { user } } = await supabase.auth.getUser();
// ...
const updateData = {
  // ...
  reviewed_by: user.id, // ❌ Using auth user ID
  // ...
};
```

### After:
```typescript
const { data: { user } } = await supabase.auth.getUser();

// Get the current user's profile ID (not auth user ID)
let { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id')
  .eq('user_id', user.id)
  .single();

// If profile doesn't exist, create it (for admin users who might not have profiles)
if (!profile || profileError?.code === 'PGRST116') {
  console.log('Creating missing admin profile...');
  
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      email: user.email || '',
      role: 'admin',
      full_name: user.user_metadata?.full_name || 'Admin User'
    })
    .select('id')
    .single();

  if (createError) {
    // Handle error...
    return;
  }
  
  profile = newProfile;
} else if (profileError) {
  // Handle other errors...
  return;
}

const updateData = {
  // ...
  reviewed_by: profile.id, // ✅ Using profile ID
  // ...
};
```

## Key Improvements
1. **Fetch Profile First**: Get the admin user's profile ID before updating the request
2. **Auto-Create Missing Profile**: If an admin user doesn't have a profile (common for existing systems), automatically create one
3. **Proper Error Handling**: Handle both profile lookup errors and profile creation errors
4. **Use Correct ID**: Use `profile.id` instead of `user.id` for foreign key references

## Impact
- ✅ Vendor request approval now works correctly
- ✅ Admin users without profiles are automatically handled
- ✅ Foreign key constraints are properly satisfied
- ✅ Proper error messages for users

## Files Modified
- `src/pages/AdminVendorRequests.tsx` - Fixed the `handleReviewRequest` function

## Testing
The fix should now allow admins to:
1. Click "Review Vendor Request"
2. Select "Approve", "Reject", or "Request Revision"
3. Add admin notes
4. Successfully submit the review without foreign key errors

The system will automatically create missing admin profiles when needed, ensuring seamless operation for existing admin users. 