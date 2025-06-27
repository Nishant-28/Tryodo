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

// Test 3: Check network conditions
function testNetworkConditions() {
  console.log('\n3. Checking network conditions...');
  
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
  
  const basicConnectivity = await testBasicConnectivity();
  if (basicConnectivity) {
    await testTableQueries();
  }
  
  console.log('\n✅ Diagnostics complete! Check the results above.');
}

// Auto-run diagnostics
runAllTests(); 