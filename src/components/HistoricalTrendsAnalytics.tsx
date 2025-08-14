import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar, TrendingUp, TrendingDown, AlertTriangle, BarChart3,
  Activity, Clock, Target, Eye, Download, Filter
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface TrendData {
  date: string;
  slot_utilization: number;
  sector_performance: number;
  city_demand: number;
  pincode_coverage: number;
  on_time_rate: number;
  cancellation_rate: number;
  revenue: number;
  capacity_utilization: number;
}

interface AnomalyAlert {
  id: string;
  type: 'slot' | 'sector' | 'city' | 'pincode';
  entity_id: string;
  entity_name: string;
  metric: string;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected_at: string;
  expected_value: number;
  actual_value: number;
}

interface SeasonalPattern {
  day_of_week: number;
  hour: number;
  average_demand: number;
  peak_multiplier: number;
  sector_id?: string;
  slot_id?: string;
}

const HistoricalTrendsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([]);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('slot_utilization');
  const [forecastData, setForecastData] = useState<TrendData[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadHistoricalData();
  }, [timeRange]);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadTrendData(),
        detectAnomalies(),
        loadSeasonalPatterns(),
        generateForecasts()
      ]);
    } catch (error) {
      console.error('Error loading historical data:', error);
      toast({
        title: "Error",
        description: "Failed to load historical analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async () => {
    const endDate = new Date();
    const startDate = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
    startDate.setDate(endDate.getDate() - days);

    // Generate sample historical data with realistic patterns
    const data: TrendData[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseMultiplier = isWeekend ? 0.7 : 1.0;
      
      // Add weekly seasonality and some randomness
      const weeklyTrend = Math.sin((dayOfWeek * 2 * Math.PI) / 7) * 0.2 + 1;
      const randomFactor = 0.8 + Math.random() * 0.4;

      data.push({
        date: d.toISOString().split('T')[0],
        slot_utilization: Math.min(100, (60 + Math.random() * 30) * baseMultiplier * weeklyTrend),
        sector_performance: Math.min(100, (75 + Math.random() * 20) * baseMultiplier),
        city_demand: Math.floor((80 + Math.random() * 40) * baseMultiplier * randomFactor),
        pincode_coverage: Math.min(100, (85 + Math.random() * 10) * baseMultiplier),
        on_time_rate: Math.min(100, (82 + Math.random() * 15) * baseMultiplier),
        cancellation_rate: Math.max(0, (5 + Math.random() * 8) * (isWeekend ? 1.3 : 1)),
        revenue: Math.floor((5000 + Math.random() * 10000) * baseMultiplier * randomFactor),
        capacity_utilization: Math.min(100, (65 + Math.random() * 25) * baseMultiplier)
      });
    }

    setTrendData(data);
  };

  const detectAnomalies = async () => {
    // Simulate anomaly detection based on statistical analysis
    const detectedAnomalies: AnomalyAlert[] = [];

    // Check for unusual patterns in recent data
    if (trendData.length > 7) {
      const recentWeek = trendData.slice(-7);
      const previousWeek = trendData.slice(-14, -7);

      const recentAvg = recentWeek.reduce((sum, d) => sum + d.slot_utilization, 0) / 7;
      const previousAvg = previousWeek.reduce((sum, d) => sum + d.slot_utilization, 0) / 7;
      const deviation = Math.abs(recentAvg - previousAvg) / previousAvg;

      if (deviation > 0.3) {
        detectedAnomalies.push({
          id: 'slot-util-anomaly-1',
          type: 'slot',
          entity_id: 'general',
          entity_name: 'Overall Slot Utilization',
          metric: 'slot_utilization',
          deviation: deviation * 100,
          severity: deviation > 0.5 ? 'high' : 'medium',
          description: `Slot utilization ${recentAvg > previousAvg ? 'increased' : 'decreased'} by ${(deviation * 100).toFixed(1)}% compared to last week`,
          detected_at: new Date().toISOString(),
          expected_value: previousAvg,
          actual_value: recentAvg
        });
      }

      // Check for cancellation rate spikes
      const recentCancellations = recentWeek.reduce((sum, d) => sum + d.cancellation_rate, 0) / 7;
      if (recentCancellations > 10) {
        detectedAnomalies.push({
          id: 'cancellation-spike-1',
          type: 'city',
          entity_id: 'general',
          entity_name: 'City Operations',
          metric: 'cancellation_rate',
          deviation: recentCancellations - 5,
          severity: recentCancellations > 15 ? 'high' : 'medium',
          description: `Cancellation rate is elevated at ${recentCancellations.toFixed(1)}% (normal: ~5%)`,
          detected_at: new Date().toISOString(),
          expected_value: 5,
          actual_value: recentCancellations
        });
      }
    }

    setAnomalies(detectedAnomalies);
  };

  const loadSeasonalPatterns = async () => {
    // Generate seasonal patterns for different days and hours
    const patterns: SeasonalPattern[] = [];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 8; hour < 20; hour++) {
        const isWeekend = day === 0 || day === 6;
        const isPeakHour = hour >= 11 && hour <= 14 || hour >= 18 && hour <= 20;
        
        let baseDemand = 30;
        if (isPeakHour) baseDemand *= 1.8;
        if (isWeekend) baseDemand *= 0.7;
        
        patterns.push({
          day_of_week: day,
          hour,
          average_demand: baseDemand + Math.random() * 10,
          peak_multiplier: isPeakHour ? 1.5 + Math.random() * 0.5 : 1.0
        });
      }
    }

    setSeasonalPatterns(patterns);
  };

  const generateForecasts = async () => {
    if (trendData.length === 0) return;

    // Simple linear regression forecast for the next 7 days
    const recent = trendData.slice(-14);
    const forecasts: TrendData[] = [];
    
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      
      // Simple trend projection with seasonal adjustment
      const lastValue = recent[recent.length - 1];
      const trend = (recent[recent.length - 1].slot_utilization - recent[0].slot_utilization) / recent.length;
      
      forecasts.push({
        date: futureDate.toISOString().split('T')[0],
        slot_utilization: Math.max(0, Math.min(100, lastValue.slot_utilization + trend * i + (Math.random() - 0.5) * 10)),
        sector_performance: Math.max(0, Math.min(100, lastValue.sector_performance + (Math.random() - 0.5) * 5)),
        city_demand: Math.max(0, lastValue.city_demand + Math.floor((Math.random() - 0.5) * 20)),
        pincode_coverage: Math.max(0, Math.min(100, lastValue.pincode_coverage + (Math.random() - 0.5) * 3)),
        on_time_rate: Math.max(0, Math.min(100, lastValue.on_time_rate + (Math.random() - 0.5) * 5)),
        cancellation_rate: Math.max(0, lastValue.cancellation_rate + (Math.random() - 0.5) * 2),
        revenue: Math.max(0, lastValue.revenue + Math.floor((Math.random() - 0.5) * 2000)),
        capacity_utilization: Math.max(0, Math.min(100, lastValue.capacity_utilization + (Math.random() - 0.5) * 8))
      });
    }

    setForecastData(forecasts);
  };

  const getMetricColor = (metric: string) => {
    const colors: { [key: string]: string } = {
      slot_utilization: '#8884d8',
      sector_performance: '#82ca9d',
      city_demand: '#ffc658',
      pincode_coverage: '#ff7300',
      on_time_rate: '#0088fe',
      cancellation_rate: '#ff0000',
      revenue: '#00c49f',
      capacity_utilization: '#ffbb28'
    };
    return colors[metric] || '#8884d8';
  };

  const formatMetricValue = (value: number, metric: string) => {
    if (metric === 'revenue') return `₹${value.toLocaleString('en-IN')}`;
    if (metric.includes('rate') || metric.includes('utilization') || metric.includes('performance')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading historical data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Historical Trends & Analysis</h3>
          <p className="text-gray-600">Track patterns, detect anomalies, and forecast trends</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slot_utilization">Slot Utilization</SelectItem>
              <SelectItem value="sector_performance">Sector Performance</SelectItem>
              <SelectItem value="on_time_rate">On-time Rate</SelectItem>
              <SelectItem value="cancellation_rate">Cancellation Rate</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="capacity_utilization">Capacity Utilization</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
            Detected Anomalies
          </h4>
          {anomalies.map(anomaly => (
            <Alert key={anomaly.id} variant={anomaly.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>{anomaly.description}</span>
                  <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                    {anomaly.severity}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Patterns</TabsTrigger>
          <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          <TabsTrigger value="comparative">Comparative Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Trends</CardTitle>
              <CardDescription>
                Track {selectedMetric.replace('_', ' ')} over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatMetricValue(value, selectedMetric), selectedMetric]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey={selectedMetric} 
                      stroke={getMetricColor(selectedMetric)}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={selectedMetric.replace('_', ' ')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Metric Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData.slice(-14)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        dataKey="capacity_utilization" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                        name="Capacity %"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="on_time_rate" 
                        stroke="#82ca9d"
                        name="On-time %"
                      />
                      <Bar 
                        dataKey="cancellation_rate" 
                        fill="#ff7c7c"
                        name="Cancellation %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries({
                    'Slot Utilization': trendData[trendData.length - 1]?.slot_utilization || 0,
                    'On-time Rate': trendData[trendData.length - 1]?.on_time_rate || 0,
                    'Sector Performance': trendData[trendData.length - 1]?.sector_performance || 0,
                    'Cancellation Rate': trendData[trendData.length - 1]?.cancellation_rate || 0
                  }).map(([metric, value]) => {
                    const trend = trendData.length > 1 ? 
                      value - (trendData[trendData.length - 2]?.[selectedMetric as keyof TrendData] || 0) : 0;
                    
                    return (
                      <div key={metric} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{metric}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatMetricValue(value, metric.toLowerCase())}</span>
                          {trend !== 0 && (
                            <div className={`flex items-center ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              <span className="text-xs ml-1">{Math.abs(trend).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Demand Patterns</CardTitle>
              <CardDescription>Average demand by day of week and hour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalPatterns.filter(p => p.hour === 12)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="day_of_week" 
                      tickFormatter={(day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average_demand" fill="#8884d8" name="Average Demand" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hourly Patterns</CardTitle>
              <CardDescription>Peak hours and demand distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seasonalPatterns.filter(p => p.day_of_week === 1)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      dataKey="average_demand" 
                      fill="#82ca9d" 
                      fillOpacity={0.6}
                      name="Demand"
                    />
                    <Area 
                      dataKey="peak_multiplier" 
                      fill="#ffc658" 
                      fillOpacity={0.4}
                      name="Peak Multiplier"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>7-Day Forecast</CardTitle>
              <CardDescription>Predicted trends based on historical patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...trendData.slice(-7), ...forecastData]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="slot_utilization" 
                      stroke="#8884d8"
                      strokeDasharray="0"
                      name="Historical"
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="slot_utilization" 
                      stroke="#ff7c7c"
                      strokeDasharray="5 5"
                      name="Forecast"
                      data={forecastData}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Forecast Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Next 24 hours</span>
                    <Badge variant="default">High (89%)</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Next 3 days</span>
                    <Badge variant="secondary">Medium (67%)</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Next 7 days</span>
                    <Badge variant="outline">Low (45%)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Predicted Peaks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>Tomorrow 12:00 PM - High demand expected</p>
                  <p>Friday 7:00 PM - Peak utilization</p>
                  <p>Weekend - 30% lower activity</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>• Increase capacity for Friday evening</p>
                  <p>• Prepare for weekend reduction</p>
                  <p>• Consider promotional campaigns</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparative" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Period Comparison</CardTitle>
              <CardDescription>Compare current period with previous periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData.slice(-14).map((item, index) => ({
                    ...item,
                    day: `Day ${index + 1}`,
                    previous_period: (item.slot_utilization * (0.9 + Math.random() * 0.2))
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="slot_utilization" fill="#8884d8" name="Current Period" />
                    <Bar dataKey="previous_period" fill="#82ca9d" name="Previous Period" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricalTrendsAnalytics; 