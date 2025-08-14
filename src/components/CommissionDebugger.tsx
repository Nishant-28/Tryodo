import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { supabase, supabaseServiceRole } from '../lib/supabase';
import { CommissionAPI } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const CommissionDebugger: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('Testing database connection...');
      
      // Test basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        addResult(`❌ Database connection failed: ${connectionError.message}`);
        return;
      }
      
      addResult('✅ Database connection successful');
      
      // Test commission_rules table existence
      addResult('Testing commission_rules table...');
      const { data: tableTest, error: tableError } = await supabase
        .from('commission_rules')
        .select('count')
        .limit(1);
      
      if (tableError) {
        addResult(`❌ Commission rules table error: ${tableError.message}`);
        addResult(`Error code: ${tableError.code}`);
        
        // Check if using localStorage fallback
        const localRules = JSON.parse(localStorage.getItem('commission_rules') || '[]');
        addResult(`📦 LocalStorage has ${localRules.length} commission rules`);
        return;
      }
      
      addResult('✅ Commission rules table accessible');
      
      // Test categories table
      addResult('Testing categories table...');
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .limit(5);
      
      if (categoriesError) {
        addResult(`❌ Categories table error: ${categoriesError.message}`);
      } else {
        addResult(`✅ Found ${categories?.length || 0} categories`);
        categories?.forEach(cat => addResult(`  - ${cat.name} (${cat.id})`));
      }
      
      // Test service role
      addResult('Testing service role access...');
      if (supabaseServiceRole && supabaseServiceRole !== supabase) {
        const { data: serviceTest, error: serviceError } = await supabaseServiceRole
          .from('commission_rules')
          .select('count')
          .limit(1);
        
        if (serviceError) {
          addResult(`❌ Service role error: ${serviceError.message}`);
        } else {
          addResult('✅ Service role access working');
        }
      } else {
        addResult('⚠️ Service role not configured or same as regular client');
      }
      
    } catch (error: any) {
      addResult(`❌ Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCommissionAPI = async () => {
    setLoading(true);
    addResult('Testing CommissionAPI...');
    
    try {
      // Test getting commission rules
      const result = await CommissionAPI.getCommissionRules();
      addResult(`API Response: success=${result.success}, message="${result.message}"`);
      addResult(`Data length: ${result.data?.length || 0}`);
      
      if (result.data && result.data.length > 0) {
        addResult('Sample rule:');
        const sample = result.data[0];
        addResult(`  - ID: ${sample.id}`);
        addResult(`  - Category: ${sample.category?.name || 'Unknown'}`);
        addResult(`  - Commission: ${sample.commission_percentage}%`);
      }
      
    } catch (error: any) {
      addResult(`❌ CommissionAPI error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testFormSubmission = async () => {
    setLoading(true);
    addResult('Testing form submission...');
    
    try {
      // Get first category for test
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .limit(1);
      
      if (!categories || categories.length === 0) {
        addResult('❌ No categories found for test');
        return;
      }
      
      const testCategory = categories[0];
      addResult(`Using test category: ${testCategory.name}`);
      
      // Test commission rule creation
      const testRule = {
        categoryId: testCategory.id,
        commissionPercentage: 10.5,
        minimumCommission: 0,
        maximumCommission: 1000,
        effectiveFrom: new Date().toISOString(),
        notes: 'Test commission rule from debugger',
        createdBy: 'test-user-id'
      };
      
      addResult('Attempting to create test commission rule...');
      const result = await CommissionAPI.upsertCommissionRule(testRule);
      
      if (result.success) {
        addResult('✅ Test commission rule created successfully!');
        addResult(`Rule ID: ${result.data?.id}`);
        
        // Clean up - delete the test rule
        if (result.data?.id) {
          const { error: deleteError } = await supabase
            .from('commission_rules')
            .update({ is_active: false })
            .eq('id', result.data.id);
          
          if (deleteError) {
            addResult(`⚠️ Could not clean up test rule: ${deleteError.message}`);
          } else {
            addResult('✅ Test rule cleaned up');
          }
        }
      } else {
        addResult(`❌ Test commission rule creation failed: ${result.error}`);
      }
      
    } catch (error: any) {
      addResult(`❌ Form submission test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Commission System Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={testDatabaseConnection} disabled={loading}>
            Test Database
          </Button>
          <Button onClick={testCommissionAPI} disabled={loading}>
            Test API
          </Button>
          <Button onClick={testFormSubmission} disabled={loading}>
            Test Form Submission
          </Button>
          <Button onClick={clearResults} variant="outline">
            Clear Results
          </Button>
        </div>
        
        {testResults.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            <h4 className="font-semibold mb-2">Test Results:</h4>
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index} className={
                  result.includes('❌') ? 'text-red-600' :
                  result.includes('✅') ? 'text-green-600' :
                  result.includes('⚠️') ? 'text-yellow-600' :
                  'text-gray-700'
                }>
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Running tests...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommissionDebugger;