import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin, Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Activity, Users, Package, Zap, ArrowRight, Eye, BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface LayerSummary {
  city: {
    total_cities: number;
    active_cities: number;
    avg_performance: number;
    top_city: string;
    alerts_count: number;
  };
  sector: {
    total_sectors: number;
    active_sectors: number;
    avg_utilization: number;
    overloaded_count: number;
    partner_coverage: number;
  };
  pincode: {
    total_pincodes: number;
    covered_pincodes: number;
    high_demand_count: number;
    sla_breach_count: number;
    coverage_percentage: number;
  };
  slot: {
    total_slots: number;
    active_slots: number;
    near_capacity_count: number;
    avg_utilization: number;
    efficiency_score: number;
  };
}

interface RealTimeAlert {
  id: string;
  level: 'city' | 'sector' | 'pincode' | 'slot';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  entity_name: string;
  metric_value: number;
  threshold: number;
  timestamp: string;
  auto_action?: string;
}

interface PerformanceMetric {
  name: string;
  current_value: number;
  target_value: number;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

const FourLayerSummary: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<LayerSummary>({
    city: { total_cities: 0, active_cities: 0, avg_performance: 0, top_city: '', alerts_count: 0 },
    sector: { total_sectors: 0, active_sectors: 0, avg_utilization: 0, overloaded_count: 0, partner_coverage: 0 },
    pincode: { total_pincodes: 0, covered_pincodes: 0, high_demand_count: 0, sla_breach_count: 0, coverage_percentage: 0 },
    slot: { total_slots: 0, active_slots: 0, near_capacity_count: 0, avg_utilization: 0, efficiency_score: 0 }
  });
  const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadSummaryData();
    const interval = setInterval(loadSummaryData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadLayerSummary(),
        loadRealTimeAlerts(),
        loadPerformanceMetrics()
      ]);
    } catch (error) {
      console.error('Error loading summary data:', error);
      toast({
        title: "Error",
        description: "Failed to load 4-layer summary",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLayerSummary = async () => {
    // Load sectors data
    const { data: sectorsData, error: sectorsError } = await supabase
      .from('sectors')
      .select(`
        id, name, city_name, pincodes, is_active,
        delivery_slots(id, is_active, max_orders),
        orders(id, order_status, created_at)
      `);

    if (sectorsError) throw sectorsError;

    // Process city-level summary
    const cities = new Set(sectorsData?.map(s => s.city_name) || []);
    const activeCities = new Set(
      sectorsData?.filter(s => s.is_active)?.map(s => s.city_name) || []
    );

    // Process sector-level summary
    const sectors = sectorsData || [];
    const activeSectors = sectors.filter(s => s.is_active);
    
    // Calculate sector utilization
    let totalSectorUtilization = 0;
    let overloadedSectors = 0;
    
    sectors.forEach(sector => {
      const totalCapacity = sector.delivery_slots?.reduce((sum: number, slot: any) => sum + (slot.max_orders || 0), 0) || 0;
      const activeOrders = sector.orders?.filter((o: any) => 
        ['pending', 'confirmed', 'processing', 'picked_up', 'out_for_delivery'].includes(o.order_status)
      ).length || 0;
      
      if (totalCapacity > 0) {
        const utilization = (activeOrders / totalCapacity) * 100;
        totalSectorUtilization += utilization;
        if (utilization > 90) overloadedSectors++;
      }
    });

    const avgSectorUtilization = sectors.length > 0 ? totalSectorUtilization / sectors.length : 0;

    // Process pincode-level summary
    const allPincodes = new Set(
      sectors.flatMap(s => s.pincodes || [])
    );
    
    // Process slot-level summary
    const allSlots = sectors.flatMap(s => s.delivery_slots || []);
    const activeSlots = allSlots.filter((slot: any) => slot.is_active);
    
    let totalSlotUtilization = 0;
    let nearCapacitySlots = 0;
    
    allSlots.forEach((slot: any) => {
      const capacity = slot.max_orders || 0;
      // Simulate current orders for each slot
      const currentOrders = Math.floor(Math.random() * capacity);
      const utilization = capacity > 0 ? (currentOrders / capacity) * 100 : 0;
      
      totalSlotUtilization += utilization;
      if (utilization > 80) nearCapacitySlots++;
    });

    const avgSlotUtilization = allSlots.length > 0 ? totalSlotUtilization / allSlots.length : 0;

    setSummary({
      city: {
        total_cities: cities.size,
        active_cities: activeCities.size,
        avg_performance: 75 + Math.random() * 20,
        top_city: Array.from(cities)[0] || 'No cities',
        alerts_count: Math.floor(Math.random() * 5)
      },
      sector: {
        total_sectors: sectors.length,
        active_sectors: activeSectors.length,
        avg_utilization: avgSectorUtilization,
        overloaded_count: overloadedSectors,
        partner_coverage: 80 + Math.random() * 15
      },
      pincode: {
        total_pincodes: allPincodes.size,
        covered_pincodes: Math.floor(allPincodes.size * 0.9),
        high_demand_count: Math.floor(allPincodes.size * 0.2),
        sla_breach_count: Math.floor(allPincodes.size * 0.1),
        coverage_percentage: 85 + Math.random() * 10
      },
      slot: {
        total_slots: allSlots.length,
        active_slots: activeSlots.length,
        near_capacity_count: nearCapacitySlots,
        avg_utilization: avgSlotUtilization,
        efficiency_score: 70 + Math.random() * 25
      }
    });
  };

  const loadRealTimeAlerts = async () => {
    // Simulate real-time alerts based on current data
    const newAlerts: RealTimeAlert[] = [];

    if (summary.sector.overloaded_count > 0) {
      newAlerts.push({
        id: 'sector-overload-1',
        level: 'sector',
        severity: 'high',
        title: 'Sector Capacity Critical',
        description: `${summary.sector.overloaded_count} sectors are over 90% capacity`,
        entity_name: 'Multiple Sectors',
        metric_value: 95,
        threshold: 90,
        timestamp: new Date().toISOString(),
        auto_action: 'Redirect traffic to nearby sectors'
      });
    }

    if (summary.slot.near_capacity_count > 5) {
      newAlerts.push({
        id: 'slot-capacity-warning',
        level: 'slot',
        severity: 'medium',
        title: 'Multiple Slots Near Capacity',
        description: `${summary.slot.near_capacity_count} slots are approaching capacity limits`,
        entity_name: 'Multiple Slots',
        metric_value: 85,
        threshold: 80,
        timestamp: new Date().toISOString()
      });
    }

    if (summary.pincode.sla_breach_count > summary.pincode.total_pincodes * 0.15) {
      newAlerts.push({
        id: 'pincode-sla-breach',
        level: 'pincode',
        severity: 'high',
        title: 'SLA Breaches Detected',
        description: `${summary.pincode.sla_breach_count} pincodes experiencing SLA breaches`,
        entity_name: 'Multiple Pincodes',
        metric_value: 20,
        threshold: 15,
        timestamp: new Date().toISOString()
      });
    }

    setAlerts(newAlerts);
  };

  const loadPerformanceMetrics = async () => {
    const performanceMetrics: PerformanceMetric[] = [
      {
        name: 'Overall System Health',
        current_value: 87,
        target_value: 90,
        trend: 'up',
        trend_percentage: 2.3,
        status: 'good'
      },
      {
        name: 'Delivery Efficiency',
        current_value: summary.slot.efficiency_score,
        target_value: 85,
        trend: 'stable',
        trend_percentage: 0.5,
        status: summary.slot.efficiency_score >= 85 ? 'excellent' : summary.slot.efficiency_score >= 75 ? 'good' : 'warning'
      },
      {
        name: 'Capacity Utilization',
        current_value: summary.sector.avg_utilization,
        target_value: 75,
        trend: summary.sector.avg_utilization > 75 ? 'up' : 'down',
        trend_percentage: Math.abs(summary.sector.avg_utilization - 75) / 75 * 100,
        status: summary.sector.avg_utilization > 90 ? 'critical' : summary.sector.avg_utilization > 80 ? 'warning' : 'good'
      },
      {
        name: 'Coverage Completeness',
        current_value: summary.pincode.coverage_percentage,
        target_value: 95,
        trend: 'up',
        trend_percentage: 1.2,
        status: summary.pincode.coverage_percentage >= 95 ? 'excellent' : summary.pincode.coverage_percentage >= 85 ? 'good' : 'warning'
      }
    ];

    setMetrics(performanceMetrics);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading 4-layer summary...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">4-Layer System Health</h3>
          <p className="text-gray-600">Real-time overview of City → Sector → Pincode → Slot performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSummaryData}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Critical Alerts</h4>
          {alerts.map(alert => (
            <Alert key={alert.id} className={cn("border-2", getSeverityColor(alert.severity))}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                    {alert.auto_action && (
                      <p className="text-xs text-blue-600 mt-1">Auto-action: {alert.auto_action}</p>
                    )}
                  </div>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Layer Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* City Layer */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                <span>Cities</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </CardTitle>
            <CardDescription>Top-level overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Active Cities</span>
                <span className="font-semibold">{summary.city.active_cities}/{summary.city.total_cities}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Performance</span>
                <span className="font-semibold">{summary.city.avg_performance.toFixed(1)}%</span>
              </div>
              <Progress value={summary.city.avg_performance} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Top Performer</span>
                <span className="font-medium text-green-600">{summary.city.top_city}</span>
              </div>
              {summary.city.alerts_count > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {summary.city.alerts_count} alerts
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sector Layer */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                <span>Sectors</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </CardTitle>
            <CardDescription>Regional performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Active Sectors</span>
                <span className="font-semibold">{summary.sector.active_sectors}/{summary.sector.total_sectors}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Utilization</span>
                <span className={cn("font-semibold", 
                  summary.sector.avg_utilization > 90 ? "text-red-600" : 
                  summary.sector.avg_utilization > 75 ? "text-yellow-600" : "text-green-600"
                )}>
                  {summary.sector.avg_utilization.toFixed(1)}%
                </span>
              </div>
              <Progress value={summary.sector.avg_utilization} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Partner Coverage</span>
                <span className="font-semibold">{summary.sector.partner_coverage.toFixed(1)}%</span>
              </div>
              {summary.sector.overloaded_count > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {summary.sector.overloaded_count} overloaded
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pincode Layer */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-purple-600" />
                <span>Pincodes</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </CardTitle>
            <CardDescription>Hyperlocal coverage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Covered</span>
                <span className="font-semibold">{summary.pincode.covered_pincodes}/{summary.pincode.total_pincodes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Coverage</span>
                <span className="font-semibold">{summary.pincode.coverage_percentage.toFixed(1)}%</span>
              </div>
              <Progress value={summary.pincode.coverage_percentage} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>High Demand</span>
                <span className="font-medium text-orange-600">{summary.pincode.high_demand_count}</span>
              </div>
              {summary.pincode.sla_breach_count > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {summary.pincode.sla_breach_count} SLA breaches
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Slot Layer */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                <span>Slots</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </CardTitle>
            <CardDescription>Time-based capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Active Slots</span>
                <span className="font-semibold">{summary.slot.active_slots}/{summary.slot.total_slots}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg Utilization</span>
                <span className="font-semibold">{summary.slot.avg_utilization.toFixed(1)}%</span>
              </div>
              <Progress value={summary.slot.avg_utilization} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Efficiency Score</span>
                <span className="font-semibold">{summary.slot.efficiency_score.toFixed(1)}%</span>
              </div>
              {summary.slot.near_capacity_count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {summary.slot.near_capacity_count} near capacity
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance Metrics</CardTitle>
          <CardDescription>Key performance indicators across all layers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map(metric => (
              <div key={metric.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <Badge className={cn("text-xs", getStatusColor(metric.status))}>
                    {metric.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{metric.current_value.toFixed(1)}%</span>
                  <div className={cn("flex items-center text-xs", 
                    metric.trend === 'up' ? "text-green-600" : 
                    metric.trend === 'down' ? "text-red-600" : "text-gray-600"
                  )}>
                    {metric.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : 
                     metric.trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                    {metric.trend_percentage.toFixed(1)}%
                  </div>
                </div>
                <Progress value={metric.current_value} className="h-2" />
                <div className="text-xs text-gray-600">
                  Target: {metric.target_value}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to detailed analytics and controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View 4-Layer Analytics
            </Button>
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Emergency Controls
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Historical Trends
            </Button>
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Real-time Monitor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FourLayerSummary; 