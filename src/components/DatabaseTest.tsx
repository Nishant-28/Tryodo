import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DatabaseTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('Testing...');

  useEffect(() => {
    const testDatabase = async () => {
      try {
        // Test basic connection
        console.log('Testing database connection...');
        
        // Try to select from profiles table
        const { data, error, count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' });

        console.log('Database test result:', { data, error, count });

        if (error) {
          if (error.code === '42P01') {
            setTestResult('❌ Profiles table does not exist! Please run the setup SQL.');
          } else {
            setTestResult(`❌ Database error: ${error.message}`);
          }
        } else {
          setTestResult(`✅ Database connected! Found ${count} profiles.`);
        }
      } catch (err) {
        console.error('Database test error:', err);
        setTestResult(`❌ Connection failed: ${err}`);
      }
    };

    testDatabase();
  }, []);

  return (
    <div className="fixed bottom-20 right-4 bg-blue-900 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2">Database Test:</h3>
      <div>{testResult}</div>
    </div>
  );
};

export default DatabaseTest; 