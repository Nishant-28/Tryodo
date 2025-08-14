// Order Cancellation Types and Interfaces

export interface OrderCancellation {
  id: string;
  order_id: string;
  delivery_partner_id: string;
  cancellation_reason: string;
  additional_details?: string;
  cancelled_at: string;
  created_at: string;
  updated_at: string;
}

export enum CancellationReason {
  CUSTOMER_UNAVAILABLE = "Customer unavailable",
  INCORRECT_ADDRESS = "Incorrect address", 
  DAMAGED_PRODUCT = "Damaged product",
  CUSTOMER_REFUSED = "Customer refused delivery",
  DELIVERY_ISSUES = "Delivery issues",
  PAYMENT_ISSUES = "Payment issues",
  VENDOR_ISSUES = "Vendor issues",
  WEATHER_CONDITIONS = "Weather conditions",
  VEHICLE_BREAKDOWN = "Vehicle breakdown",
  OTHER = "Other"
}

export enum ItemCancellationReason {
  FAULT_IN_PRODUCT = "FAULT_IN_PRODUCT",
  NOT_NEEDED_NOW = "NOT_NEEDED_NOW",
  OTHER = "OTHER"
}

export interface CancellationRequest {
  order_id: string;
  delivery_partner_id: string;
  cancellation_reason: CancellationReason;
  additional_details?: string;
}

export interface ItemCancellationRequest {
  order_id: string;
  order_item_id: string;
  reason: ItemCancellationReason;
  additional_details?: string;
}

export interface CancellationResponse {
  success: boolean;
  cancellation_id?: string;
  message?: string;
  error?: string;
}

export interface ItemCancellationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CancelledOrderDetails {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  cancellation: OrderCancellation;
  delivery_partner_name: string;
  cancelled_at: string;
  vendor_names: string[];
}

export interface CancellationAnalytics {
  total_cancellations: number;
  cancellation_rate: number;
  top_reasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  monthly_trends: Array<{
    month: string;
    cancellations: number;
    total_orders: number;
    rate: number;
  }>;
  delivery_partner_stats: Array<{
    delivery_partner_id: string;
    delivery_partner_name: string;
    cancellations: number;
    total_deliveries: number;
    cancellation_rate: number;
  }>;
  vendor_impact: Array<{
    vendor_id: string;
    vendor_name: string;
    cancelled_orders: number;
    cancelled_value: number;
  }>;
}

export interface CancellationFilters {
  start_date?: string;
  end_date?: string;
  delivery_partner_id?: string;
  vendor_id?: string;
  cancellation_reason?: CancellationReason;
  page?: number;
  limit?: number;
}

// Extended Order interface to include cancellation data
export interface OrderWithCancellation {
  id: string;
  order_number: string;
  customer_id: string;
  total_amount: number;
  order_status: string;
  cancellation_id?: string;
  cancelled_date?: string;
  cancellation_reason?: string;
  cancellation?: OrderCancellation;
  // ... other order fields
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Notification types for cancellations
export interface CancellationNotification {
  type: 'order_cancelled';
  order_id: string;
  order_number: string;
  recipient_type: 'vendor' | 'customer' | 'admin';
  recipient_id: string;
  cancellation_reason: string;
  cancelled_by: string;
  cancelled_at: string;
  additional_details?: string;
}