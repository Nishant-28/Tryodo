import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, TrendingDown, TrendingUp, Calendar, User,
  BarChart3, PieChart, RefreshCw, Download, Filter,
  Clock, Package, Truck, XCircle, Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { DeliveryAPI } from '@/lib/deliveryApi';
import { CancellationAnalytics as CancellationAnalyticsType, CancellationFilters } from '@/types/orderCancellation';

interface CancellationAnalyticsProps {
  className?: string;
}

const CancellationAnalytics: React.FC<CancellationAnalyticsProps> = ({ className }) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<CancellationAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CancellationFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    endDate: new Date().toISOString().split('T')[0]
  });

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await DeliveryAPI.getCancellationAnalytics(filters);
      
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        throw new Error(response.error || 'Failed to load analytics');
      }
    } catch (error: any) {
      console.error('Error loading cancellation analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load cancellation analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const exportAnalytics = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Cancellations', analytics.totalCancellations.toString()],
      ['Cancellation Rate', `${analytics.cancellationRate.toFixed(2)}%`],
      ['Most Common Reason', analytics.topReasons[0]?.reason || 'N/A'],
      ['Average Order Value', `₹${analytics.averageCancelledOrderValue.toFixed(2)}`],
      ['Total Value Lost', `₹${analytics.totalValueLost.toFixed(2)}`],
      ['Peak Cancellation Hour', analytics.peakCancellationHour?.toString() || 'N/A'],
      ...analytics.topReasons.map(reason => [
        `Reason: ${reason.reason}`,
        `${reason.count} (${reason.percentage.toFixed(1)}%)`
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cancellation-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading cancellation analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">Unable to load cancellation analytics.</p>
              <Button onClick={loadAnalytics} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cancellation Analytics</h2>
          <p className="text-gray-600">Monitor and analyze order cancellation patterns</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            value={`${filters.startDate}_${filters.endDate}`}
            onValueChange={(value) => {
              const [startDate, endDate] = value.split('_');
              setFilters(prev => ({ ...prev, startDate, endDate }));
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={`${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}_${new Date().toISOString().split('T')[0]}`}>
                Last 7 days
              </SelectItem>
              <SelectItem value={`${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}_${new Date().toISOString().split('T')[0]}`}>
                Last 30 days
              </SelectItem>
              <SelectItem value={`${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}_${new Date().toISOString().split('T')[0]}`}>
                Last 90 days
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cancellations</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.totalCancellations || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              {analytics.cancellationTrend && analytics.cancellationTrend > 0 ? (
                <span className="text-red-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{analytics.cancellationTrend.toFixed(1)}% from last period
                </span>
              ) : analytics.cancellationTrend && analytics.cancellationTrend < 0 ? (
                <span className="text-green-500 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {Math.abs(analytics.cancellationTrend).toFixed(1)}% from last period
                </span>
              ) : (
                <span className="text-gray-500 flex items-center">
                  <Activity className="h-3 w-3 mr-1" />
                  No change from last period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analytics.cancellationRate.toFixed(1)}%
            </div>
            <Progress 
              value={analytics.cancellationRate} 
              className="mt-2"
              max={100}
            />
            <p className="text-xs text-gray-600 mt-1">
              Of total orders in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cancelled Value</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{analytics.averageCancelledOrderValue.toFixed(0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Per cancelled order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value Lost</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{analytics.totalValueLost.toFixed(0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Revenue impact
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Cancellation Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Top Cancellation Reasons
            </CardTitle>
            <CardDescription>
              Most common reasons for order cancellations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topReasons.map((reason, index) => (
                <div key={reason.reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-red-500' :
                      index === 1 ? 'bg-orange-500' :
                      index === 2 ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium">{reason.reason}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{reason.count}</div>
                    <div className="text-xs text-gray-600">{reason.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Partner Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Partner Impact
            </CardTitle>
            <CardDescription>
              Partners with highest cancellation rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(analytics.deliveryPartnerStats || []).map((partner, index) => (
                <div key={partner.delivery_partner_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {partner.delivery_partner_name || `Partner ${partner.delivery_partner_id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {partner.total_orders} total orders
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={partner.cancellation_rate > 10 ? 'destructive' : 'secondary'}>
                      {partner.cancellations} cancellations
                    </Badge>
                    <div className="text-xs text-gray-600 mt-1">
                      {partner.cancellation_rate.toFixed(1)}% rate
                    </div>
                  </div>
                </div>
              ))}
              {(analytics.deliveryPartnerStats || []).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No delivery partner data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time-based Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cancellation Patterns
          </CardTitle>
          <CardDescription>
            When cancellations occur most frequently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.peakCancellationHour || 'N/A'}:00
              </div>
              <p className="text-sm text-gray-600">Peak cancellation hour</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(analytics.dailyTrends || []).reduce((sum, day) => sum + day.cancellations, 0) / (analytics.dailyTrends || []).length || 0}
              </div>
              <p className="text-sm text-gray-600">Avg. daily cancellations</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...(analytics.dailyTrends || []).map(day => day.cancellations), 0)}
              </div>
              <p className="text-sm text-gray-600">Highest single day</p>
            </div>
          </div>
          
          {/* Daily Trend Chart (simplified) */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Daily Cancellation Trend</h4>
            <div className="flex items-end justify-between h-32 gap-1">
              {(analytics.dailyTrends || []).slice(-14).map((day, index) => {
                const maxCancellations = Math.max(...(analytics.dailyTrends || []).map(d => d.cancellations), 1);
                const height = (day.cancellations / maxCancellations) * 100;
                
                return (
                  <div key={day.date} className="flex flex-col items-center flex-1">
                    <div 
                      className="bg-blue-500 rounded-t w-full min-h-[4px] transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.cancellations} cancellations`}
                    />
                    <div className="text-xs text-gray-600 mt-1 transform -rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString('en-IN', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CancellationAnalytics;