// Browser-based Supabase connection diagnostic
// Run this in your browser's dev tools console

console.log('🔍 Starting Supabase connection diagnostics...');

// Test 1: Basic network connectivity
async function testBasicConnectivity() {
  console.log('\n1. Testing basic network connectivity...');
  try {
    const response = await fetch('https://oyvrgimwbtnurckftpck.supabase.co/rest/v1/', {
      method: 'GET',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnJnaW13YnRudXJja2Z0cGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MzU2ODksImV4cCI6MjA2NTExMTY4OX0.H-PNaoYpeVdbUnnBNiqB8-Cge6bHCp4kMTmXuLCB1_8',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnJnaW13YnRudXJja2Z0cGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MzU2ODksImV4cCI6MjA2NTExMTY4OX0.H-PNaoYpeVdbUnnBNiqB8-Cge6bHCp4kMTmXuLCB1_8',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Basic connectivity test:', response.status, response.statusText);
    return true;
  } catch (error) {
    console.error('❌ Basic connectivity failed:', error.message);
    return false;
  }
}

// Test 2: Test specific table queries
async function testTableQueries() {
  console.log('\n2. Testing table queries...');
  
  const tables = ['profiles', 'vendors', 'customers', 'orders'];
  
  for (const table of tables) {
    try {
      const response = await fetch(`https://oyvrgimwbtnurckftpck.supabase.co/rest/v1/${table}?select=count&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnJnaW13YnRudXJja2Z0cGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MzU2ODksImV4cCI6MjA2NTExMTY4OX0.H-PNaoYpeVdbUnnBNiqB8-Cge6bHCp4kMTmXuLCB1_8',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnJnaW13YnRudXJja2Z0cGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MzU2ODksImV4cCI6MjA2NTExMTY4OX0.H-PNaoYpeVdbUnnBNiqB8-Cge6bHCp4kMTmXuLCB1_8',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ ${table} table accessible`);
      } else {
        console.log(`❌ ${table} table failed:`, response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error details:', errorText);
      }
    } catch (error) {
      console.error(`❌ ${table} table error:`, error.message);
    }
  }
}

// Test 3: Check CORS and headers
async function testCORSAndHeaders() {
  console.log('\n3. Testing CORS and headers...');
  try {
    const response = await fetch('https://oyvrgimwbtnurckftpck.supabase.co/rest/v1/profiles?select=count&limit=1', {
      method: 'GET',
      mode: 'cors',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnJnaW13YnRudXJja2Z0cGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MzU2ODksImV4cCI6MjA2NTExMTY4OX0.H-PNaoYpeVdbUnnBNiqB8-Cge6bHCp4kMTmXuLCB1_8',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnJnaW13YnRudXJja2Z0cGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MzU2ODksImV4cCI6MjA2NTExMTY4OX0.H-PNaoYpeVdbUnnBNiqB8-Cge6bHCp4kMTmXuLCB1_8',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log('✅ CORS test:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
  }
}

// Test 4: Check auth state in localStorage
function testLocalStorageAuth() {
  console.log('\n4. Checking localStorage for auth tokens...');
  
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('sb-') || key.includes('auth')
  );
  
  console.log('Auth-related localStorage keys:', authKeys);
  
  authKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        console.log(`${key}:`, {
          hasAccessToken: !!parsed.access_token,
          hasUser: !!parsed.user,
          expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000) : null
        });
      }
    } catch (e) {
      console.log(`${key}: (not JSON)`, value?.substring(0, 50) + '...');
    }
  });
}

// Test 5: Check network conditions
function testNetworkConditions() {
  console.log('\n5. Checking network conditions...');
  
  if ('connection' in navigator) {
    const connection = navigator.connection;
    console.log('Network info:', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    });
  } else {
    console.log('Network API not available');
  }
  
  // Check if online
  console.log('Navigator online status:', navigator.onLine);
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running comprehensive Supabase diagnostics...\n');
  
  testNetworkConditions();
  testLocalStorageAuth();
  
  const basicConnectivity = await testBasicConnectivity();
  if (basicConnectivity) {
    await testTableQueries();
    await testCORSAndHeaders();
  }
  
  console.log('\n✅ Diagnostics complete! Check the results above.');
}

// Auto-run diagnostics
runAllTests(); 