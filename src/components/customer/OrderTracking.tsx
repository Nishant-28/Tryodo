import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, MapPin, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface OrderStatus {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending' | 'cancelled';
  icon: React.ElementType;
}

interface OrderTrackingProps {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  itemStatus: string;
  estimatedDelivery: string;
  vendor: string;
  vendorId?: string;
  createdAt: string;
  confirmedAt?: string;
  pickedUpAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  pickupConfirmedBy?: string;
  vendorNotes?: string;
}

const OrderTracking = ({ 
  orderId, 
  orderNumber, 
  currentStatus, 
  itemStatus, 
  estimatedDelivery, 
  vendor, 
  vendorId,
  createdAt,
  confirmedAt,
  pickedUpAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
  pickupConfirmedBy,
  vendorNotes
}: OrderTrackingProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getOrderStatuses = (): OrderStatus[] => {
    const statuses: OrderStatus[] = [
      {
        id: 'placed',
        title: 'Order Placed',
        description: 'Your order has been placed successfully',
        timestamp: formatTimestamp(createdAt),
        status: 'completed',
        icon: CheckCircle
      }
    ];

    // Add vendor confirmation status
    if (itemStatus === 'cancelled' || currentStatus === 'cancelled') {
      statuses.push({
        id: 'cancelled',
        title: 'Order Cancelled',
        description: `Order was cancelled by ${vendor}`,
        timestamp: cancelledAt ? formatTimestamp(cancelledAt) : '',
        status: 'cancelled',
        icon: AlertCircle
      });
    } else {
      statuses.push({
        id: 'confirmed',
        title: 'Confirmed by Vendor',
        description: `${vendor} has confirmed your order`,
        timestamp: confirmedAt ? formatTimestamp(confirmedAt) : '',
        status: ['confirmed', 'processing', 'packed', 'picked_up', 'shipped', 'delivered'].includes(itemStatus) ? 'completed' : 
                 itemStatus === 'pending' ? 'pending' : 'pending',
        icon: CheckCircle
      });

      // Add processing status
      statuses.push({
        id: 'processing',
        title: 'Order Processing',
        description: 'Your order is being prepared by the vendor',
        timestamp: itemStatus === 'processing' && confirmedAt ? formatTimestamp(confirmedAt) : '',
        status: ['processing', 'packed', 'picked_up', 'shipped', 'delivered'].includes(itemStatus) ? 'completed' : 
                 ['confirmed'].includes(itemStatus) ? 'current' : 'pending',
        icon: Package
      });

      // Add packed status
      statuses.push({
        id: 'packed',
        title: 'Order Packed',
        description: 'Your order has been packed and ready for pickup',
        timestamp: itemStatus === 'packed' && confirmedAt ? formatTimestamp(confirmedAt) : '',
        status: ['packed', 'picked_up', 'shipped', 'delivered'].includes(itemStatus) ? 'completed' : 
                 ['processing'].includes(itemStatus) ? 'current' : 'pending',
        icon: Package
      });

      // Add pickup status
      statuses.push({
        id: 'picked_up',
        title: 'Order Picked Up',
        description: pickupConfirmedBy ? 
          `Picked up by delivery partner (${pickupConfirmedBy})` : 
          'Order has been picked up by delivery partner',
        timestamp: pickedUpAt ? formatTimestamp(pickedUpAt) : '',
        status: ['picked_up', 'shipped', 'delivered'].includes(itemStatus) ? 'completed' : 
                 ['packed'].includes(itemStatus) ? 'current' : 'pending',
        icon: User
      });

      // Add out for delivery status
      statuses.push({
        id: 'shipped',
        title: 'Out for Delivery',
        description: 'Your order is on the way to your location',
        timestamp: shippedAt ? formatTimestamp(shippedAt) : '',
        status: ['shipped', 'delivered'].includes(itemStatus) ? 'completed' : 
                 itemStatus === 'picked_up' ? 'current' : 'pending',
        icon: Truck
      });

      // Add delivered status (dummy for now)
      statuses.push({
        id: 'delivered',
        title: 'Delivered',
        description: 'Order delivered successfully',
        timestamp: deliveredAt ? formatTimestamp(deliveredAt) : estimatedDelivery,
        status: itemStatus === 'delivered' ? 'completed' : 'pending',
        icon: MapPin
      });
    }

    return statuses;
  };

  const orderStatuses = getOrderStatuses();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'current': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  const getLineColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'cancelled': return 'bg-red-600';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Order {orderNumber}</h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-gray-600">Vendor: {vendor}</p>
          <p className="text-sm text-gray-600">Estimated delivery: {estimatedDelivery}</p>
        </div>
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
                  {status.status === 'completed' && status.timestamp && (
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

                {status.status === 'cancelled' && (
                  <div className="mt-2 flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-1" />
                    <span className="text-xs text-red-600">Cancelled</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional info */}
      {vendorNotes && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Vendor Notes</h4>
          <p className="text-sm text-gray-700">{vendorNotes}</p>
        </div>
      )}

      {/* Current status info */}
      {itemStatus === 'picked_up' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Delivery Status</h4>
          <p className="text-sm text-blue-800">Your order has been picked up and will be out for delivery soon</p>
          {pickupConfirmedBy && (
            <p className="text-xs text-blue-600 mt-1">Confirmed by: {pickupConfirmedBy}</p>
          )}
        </div>
      )}

      {itemStatus === 'shipped' && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="text-sm font-semibold text-green-900 mb-2">Out for Delivery</h4>
          <p className="text-sm text-green-800">Your order is on the way to your delivery address</p>
          <p className="text-xs text-green-600 mt-1">Expected delivery: {estimatedDelivery}</p>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
