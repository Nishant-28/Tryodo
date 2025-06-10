
import React from 'react';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';

interface OrderStatus {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
  icon: React.ElementType;
}

interface OrderTrackingProps {
  orderId: string;
  currentStatus: string;
  estimatedDelivery: string;
  vendor: string;
  deliveryBoy?: string;
}

const OrderTracking = ({ orderId, currentStatus, estimatedDelivery, vendor, deliveryBoy }: OrderTrackingProps) => {
  const orderStatuses: OrderStatus[] = [
    {
      id: 'placed',
      title: 'Order Placed',
      description: 'Your order has been placed successfully',
      timestamp: '2024-01-15 10:30 AM',
      status: 'completed',
      icon: CheckCircle
    },
    {
      id: 'confirmed',
      title: 'Confirmed by Vendor',
      description: `${vendor} has confirmed your order`,
      timestamp: '2024-01-15 11:15 AM',
      status: currentStatus === 'placed' ? 'pending' : 'completed',
      icon: CheckCircle
    },
    {
      id: 'prepared',
      title: 'Order Prepared',
      description: 'Your order is being prepared for shipment',
      timestamp: '2024-01-15 02:30 PM',
      status: ['placed', 'confirmed'].includes(currentStatus) ? 'pending' : 'completed',
      icon: Package
    },
    {
      id: 'shipped',
      title: 'Out for Delivery',
      description: deliveryBoy ? `Assigned to ${deliveryBoy}` : 'Assigned to delivery partner',
      timestamp: '2024-01-15 04:00 PM',
      status: currentStatus === 'shipped' ? 'current' : ['placed', 'confirmed', 'prepared'].includes(currentStatus) ? 'pending' : 'completed',
      icon: Truck
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: 'Order delivered successfully',
      timestamp: estimatedDelivery,
      status: currentStatus === 'delivered' ? 'completed' : 'pending',
      icon: MapPin
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'current': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  const getLineColor = (status: string) => {
    return status === 'completed' ? 'bg-green-600' : 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Order #{orderId}</h3>
        <p className="text-sm text-gray-600">Estimated delivery: {estimatedDelivery}</p>
      </div>

      <div className="relative">
        {orderStatuses.map((status, index) => {
          const Icon = status.icon;
          const isLast = index === orderStatuses.length - 1;
          
          return (
            <div key={status.id} className="relative flex items-start">
              {/* Timeline line */}
              {!isLast && (
                <div className={`absolute left-6 top-12 w-0.5 h-16 ${getLineColor(status.status)}`} />
              )}
              
              {/* Status icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(status.status)}`}>
                <Icon className="h-6 w-6" />
              </div>
              
              {/* Status content */}
              <div className="ml-4 flex-1 pb-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">{status.title}</h4>
                  {status.status === 'completed' && (
                    <span className="text-xs text-gray-500">{status.timestamp}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{status.description}</p>
                
                {status.status === 'current' && (
                  <div className="mt-2 flex items-center">
                    <Clock className="h-4 w-4 text-blue-600 mr-1" />
                    <span className="text-xs text-blue-600">In Progress</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery info */}
      {deliveryBoy && currentStatus === 'shipped' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Delivery Partner</h4>
          <p className="text-sm text-blue-800">{deliveryBoy}</p>
          <p className="text-xs text-blue-600 mt-1">Contact: +91 98765 43210</p>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
