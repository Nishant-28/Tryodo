import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import AdminMarketplaceAnalytics from '@/components/AdminMarketplaceAnalytics';
import { useAuth } from '@/contexts/AuthContext';

const AdminMarketplaceAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Check if user is admin
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin-dashboard')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marketplace Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive marketplace performance monitoring</p>
            </div>
          </div>
        </div>

        {/* Analytics Component */}
        <AdminMarketplaceAnalytics />
      </main>
    </div>
  );
};

export default AdminMarketplaceAnalyticsPage;