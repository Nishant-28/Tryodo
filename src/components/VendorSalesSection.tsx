import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export interface VendorSales {
  vendor_id: string;
  business_name: string;
  orders: number;
  gmv: number;
  commission: number;
}

interface Props {
  vendorSales: VendorSales[];
}

const VendorSalesSection: React.FC<Props> = ({ vendorSales }) => {
  if (!vendorSales || vendorSales.length === 0) {
    return (
      <Card>
        <CardContent>
          <p className="text-center py-8 text-gray-500">No vendor sales data</p>
        </CardContent>
      </Card>
    );
  }

  const totalGMV = vendorSales.reduce((sum, v) => sum + v.gmv, 0);
  const totalOrders = vendorSales.reduce((sum, v) => sum + v.orders, 0);
  const topFive = vendorSales.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Vendor GMV</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{totalGMV.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Vendor Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unique Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{vendorSales.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Vendors by GMV</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topFive} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="business_name" />
              <YAxis />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="gmv" fill="#3b82f6" name="GMV" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vendor Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-2 whitespace-nowrap">Vendor</th>
                  <th className="px-2 py-2 whitespace-nowrap">Orders</th>
                  <th className="px-2 py-2 whitespace-nowrap">GMV (₹)</th>
                  <th className="px-2 py-2 whitespace-nowrap">Commission (₹)</th>
                </tr>
              </thead>
              <tbody>
                {vendorSales.map((v) => (
                  <tr key={v.vendor_id} className="border-t">
                    <td className="px-2 py-2 whitespace-nowrap">{v.business_name}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{v.orders}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{v.gmv.toLocaleString()}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{v.commission.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorSalesSection;
