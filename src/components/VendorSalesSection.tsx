import React, { useState } from 'react';
import { 
  Package, Clock, MapPin, Phone, Star, TrendingUp, Users, 
  DollarSign, CheckCircle, AlertCircle, Eye, Truck, 
  ArrowRight, RefreshCw, Calendar, Target, Bell,
  ChevronDown, ChevronUp, Store, Timer, Navigation,
  Route, Copy, ExternalLink, Grid, List,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VendorSales {
  vendor_id: string;
  business_name: string;
  orders: number;
  gmv: number;
  commission: number;
}

interface VendorSalesSectionProps {
  vendorSalesSummary: VendorSales[];
  onRefresh: () => void;
  refreshing?: boolean;
}

const VendorSalesSection: React.FC<VendorSalesSectionProps> = ({
  vendorSalesSummary,
  onRefresh,
  refreshing = false,
}) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Vendor Sales Overview</h2>
        <Button onClick={onRefresh} disabled={refreshing} variant="outline">
          {refreshing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Data
        </Button>
      </div>

      {vendorSalesSummary.length === 0 ? (
        <Alert className="bg-white border-blue-200 text-blue-800">
          <Info className="h-5 w-5" />
          <AlertDescription>
            No vendor sales data available yet. Please ensure orders are placed and processed.
          </AlertDescription>
        </Alert>
      ) : (
        <ScrollArea className="h-[700px]">
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {vendorSalesSummary.map((vendor) => (
              <Card key={vendor.vendor_id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">{vendor.business_name}</CardTitle>
                  <Badge variant="secondary">ID: {vendor.vendor_id.substring(0, 8)}...</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Total Orders:</span>
                    <span className="font-medium text-base">{vendor.orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Gross Merchandise Value (GMV):</span>
                    <span className="font-medium text-base">{formatCurrency(vendor.gmv)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Estimated Commission:</span>
                    <span className="font-medium text-green-600 text-base">{formatCurrency(vendor.commission)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default VendorSalesSection;
