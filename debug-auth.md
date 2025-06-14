# Authentication Debug Guide

## ✅ **FIXED: Session Persistence Issue**

The authentication system has been updated to properly persist sessions across page refreshes.

### **What Was Fixed:**
1. **Supabase Client Configuration**: Added proper auth persistence settings
2. **Auth Context Improvements**: Better session restoration and loading states
3. **Storage Management**: Proper localStorage usage with custom storage key
4. **Session Detection**: Enhanced session detection and restoration

### **Key Improvements:**
- ✅ Sessions now persist across browser refreshes
- ✅ Better loading states during auth initialization  
- ✅ Improved error handling and timeouts
- ✅ Enhanced debugging capabilities

---

## Common Issues and Solutions

### 1. "Authenticating..." Stuck Loading

**Symptoms:**
- Login page shows "Authenticating..." indefinitely
- Need to clear cookies/storage manually to login again

**Causes:**
- Stale auth sessions in localStorage/sessionStorage
- Race conditions in auth state updates
- Profile loading failures

**Solutions:**

#### Quick Fix:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run: `forceAuthReset()` (if available)
4. Or manually clear storage:
```javascript
// Clear all Supabase auth data
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth') || key === 'tryodo-auth-token') {
    localStorage.removeItem(key);
  }
});
Object.keys(sessionStorage).forEach(key => {
  if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
    sessionStorage.removeItem(key);
  }
});
window.location.reload();
```

### 2. Session Not Persisting After Page Refresh

**Symptoms:**
- User gets logged out after refreshing the page
- Need to login again after browser restart

**Causes:**
- Incorrect Supabase client configuration
- Missing auth persistence settings
- Storage issues

**Solutions:**

#### ✅ **Already Fixed** in the latest update:
- Supabase client now configured with proper persistence
- Custom storage key: `tryodo-auth-token`
- Auto token refresh enabled
- Session detection improved

#### Verify Fix:
```javascript
// Run in browser console to check configuration
console.log('Storage Key:', 'tryodo-auth-token');
console.log('Auth Keys:', Object.keys(localStorage).filter(k => k.includes('auth') || k.startsWith('sb-')));
```

### 3. Role-Based Redirect Issues

**Symptoms:**
- Accessing vendor/admin pages doesn't redirect to correct dashboard
- Users can access unauthorized pages

**Solutions:**

#### Check Current Auth State:
```javascript
// Run in browser console  
debugAuthState(); // Available in development
```

#### Verify Role-Based Redirects:
- Customer should go to: `/`
- Vendor should go to: `/vendor-dashboard`  
- Admin should go to: `/admin-dashboard`

---

## 🧪 **Testing Session Persistence**

### **Using the Test Page:**
1. Open `test-auth-persistence.html` in your browser
2. Update the Supabase URL and key in the script
3. Follow the test instructions

### **Manual Testing Steps:**
1. **Login** to your app as any role (vendor recommended)
2. **Navigate** to the appropriate dashboard
3. **Refresh the page** - you should stay logged in
4. **Close and reopen** the browser tab - you should still be logged in
5. **Check console logs** for auth state messages

### **Expected Behavior:**
- ✅ **Page Refresh**: User stays logged in, redirected to correct dashboard
- ✅ **Browser Restart**: User stays logged in (unless session expired)
- ✅ **New Tab**: Opening app in new tab should detect existing session
- ✅ **Role Redirect**: Wrong role pages redirect to appropriate dashboard

---

## Development Debug Features

### **Enhanced Console Logging**
All auth operations now log with emojis:
- 🚀 Auth initialization
- 🔄 Auth state changes
- ✅ Successful operations
- ❌ Errors
- 👤 User operations
- 🚪 Sign out operations
- 🛡️ Protected route checks

### **Debug Functions (Development Only)**
```javascript
// Available in browser console
debugAuthState();        // Check current auth state
clearAuthStorage();      // Clear all auth storage
forceAuthReset();       // Complete auth reset
```

### **Force Auth Reset Button**
- Available in header dropdown menu (development only)
- Clears all auth state and redirects to login

---

## Monitoring Auth Issues

### **Browser DevTools - Console**
Look for these log patterns:
- `🚀 AuthProvider initializing...` - Auth system starting
- `📋 Initial session: Found for user@email.com` - Session restored
- `✅ Profile loaded successfully: user@email.com - vendor` - Profile loaded
- `🔐 Attempting sign in for:` - Login attempts
- `🛡️ ProtectedRoute check:` - Route access checks

### **Browser DevTools - Application Tab**
Check storage locations:
- **localStorage**: Look for `tryodo-auth-token` and `sb-*` keys
- **sessionStorage**: Should be minimal auth data
- **Cookies**: Check for any Supabase cookies

### **Network Tab**
Monitor API calls:
- Initial session restoration should succeed
- Profile fetch requests should return 200
- Token refresh should work automatically

---

## Configuration Details

### **Supabase Client Settings**
```javascript
{
  auth: {
    storage: window.localStorage,           // Use localStorage for persistence
    autoRefreshToken: true,                // Auto-refresh expired tokens
    persistSession: true,                  // Persist across browser sessions
    detectSessionInUrl: true,              // Detect auth callbacks
    storageKey: 'tryodo-auth-token',      // Custom storage key
    flowType: 'pkce',                     // Secure auth flow
  }
}
```

### **Auth Context Features**
- **Initialization tracking**: `initializing` state
- **Loading management**: Separate loading states
- **Session restoration**: Automatic on app start
- **Profile fetching**: Automatic after session restoration
- **Error handling**: Comprehensive error catching
- **Timeouts**: Prevent infinite loading states

---

## Recovery Steps

If auth is completely broken:

1. **Quick Reset:**
```javascript
// Run in console
forceAuthReset();
```

2. **Manual Reset:**
```javascript
localStorage.clear();
sessionStorage.clear();
window.location.href = '/login';
```

3. **Check Configuration:**
- Verify Supabase URL and keys
- Check database RLS policies
- Verify profiles table structure

4. **Hard Refresh:**
- Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Clear browser cache if needed

---

## Test Credentials

For testing different roles:

### Customer Account
- Email: customer@test.com
- Password: test123
- Expected: Redirect to `/`

### Vendor Account  
- Email: vendor@test.com
- Password: test123
- Expected: Redirect to `/vendor-dashboard`

### Admin Account
- Email: admin@test.com
- Password: test123
- Expected: Redirect to `/admin-dashboard`

---

## Support Information

If issues persist after following this guide:

1. **Check browser console** for specific error messages
2. **Verify environment variables** are correctly set
3. **Test with different browsers** to isolate browser-specific issues
4. **Check Supabase dashboard** for auth user status
5. **Verify database connectivity** and RLS policies 