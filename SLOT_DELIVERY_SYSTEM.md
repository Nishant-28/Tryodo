# Slot-Based Delivery System Implementation

## Overview

This document outlines the implementation of a comprehensive slot-based delivery system for the Tryodo-Website project. The system replaces the traditional delivery approach with a structured, time-slot based system that provides better control, optimization, and customer experience.

## System Architecture

### Database Schema

The system introduces several new database tables to manage sectors, slots, and delivery tracking:

#### 1. Sectors Table
```sql
CREATE TABLE sectors (
    id UUID PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    pincodes INTEGER[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Delivery Slots Table
```sql
CREATE TABLE delivery_slots (
    id UUID PRIMARY KEY,
    sector_id UUID REFERENCES sectors(id),
    slot_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    cutoff_time TIME NOT NULL,
    pickup_delay_minutes INTEGER DEFAULT 45,
    max_orders INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    day_of_week INTEGER[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. Delivery Assignments Table
```sql
CREATE TABLE delivery_assignments (
    id UUID PRIMARY KEY,
    delivery_partner_id UUID NOT NULL,
    slot_id UUID REFERENCES delivery_slots(id),
    assigned_date DATE NOT NULL,
    sector_id UUID REFERENCES sectors(id),
    max_orders INTEGER DEFAULT 30,
    current_orders INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'assigned',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. Order Tracking Tables
```sql
-- Order Pickups
CREATE TABLE order_pickups (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    vendor_id UUID NOT NULL,
    delivery_partner_id UUID NOT NULL,
    pickup_status VARCHAR(20) DEFAULT 'pending',
    pickup_time TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Deliveries
CREATE TABLE order_deliveries (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    delivery_partner_id UUID NOT NULL,
    delivery_status VARCHAR(20) DEFAULT 'pending',
    delivery_time TIMESTAMP WITH TIME ZONE,
    delivery_notes TEXT,
    customer_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. Enhanced Orders Table
```sql
-- Additional columns added to existing orders table
ALTER TABLE orders 
ADD COLUMN slot_id UUID REFERENCES delivery_slots(id),
ADD COLUMN sector_id UUID REFERENCES sectors(id),
ADD COLUMN delivery_date DATE,
ADD COLUMN pickup_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN out_for_delivery_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN estimated_delivery_time TIMESTAMP WITH TIME ZONE;
```

## Frontend Components

### 1. SlotSelection Component (`src/components/SlotSelection.tsx`)

A mobile-friendly component that allows customers to select delivery slots during checkout:

**Features:**
- Displays available slots based on customer's pincode
- Shows real-time slot availability
- Filters out past cutoff times for same-day delivery
- Mobile-responsive design with express/same-day/next-day badges
- Sector-based slot loading with automatic pincode detection

**Usage:**
```tsx
<SlotSelection
  customerPincode={getSelectedAddressPincode()}
  selectedDate={selectedDate}
  onSlotSelect={handleSlotSelect}
  selectedSlotId={selectedSlot?.id}
/>
```

### 2. AdminSectorManagement Component (`src/pages/AdminSectorManagement.tsx`)

Comprehensive admin interface for managing delivery sectors:

**Features:**
- Create, edit, and delete sectors
- Group pincodes into delivery zones
- City-wise sector organization
- Pincode uniqueness validation
- Mobile-friendly management interface
- Search and filter capabilities
- Real-time statistics dashboard

### 3. AdminSlotManagement Component (`src/pages/AdminSlotManagement.tsx`)

Advanced admin interface for managing delivery time slots:

**Features:**
- Create and configure delivery slots
- Set cutoff times and pickup delays
- Configure capacity limits per slot
- Day-of-week availability settings
- Sector-based slot assignment
- Express/Same Day/Next Day categorization
- Comprehensive validation and error handling

### 4. DeliveryBoyDashboard Component (`src/pages/DeliveryBoyDashboard.tsx`)

Complete delivery partner management dashboard:

**Features:**
- View assigned slots and daily schedules
- Manage pickup tasks with vendor details
- Handle delivery tasks with customer information
- Update order status (pending → en_route → picked_up/delivered)
- Add notes and track completion
- Direct calling and navigation integration
- Real-time status updates

## API Layer

### Delivery API (`src/lib/deliveryApi.ts`)

Comprehensive API layer for managing the delivery system:

#### Sector Management
```typescript
export const sectorAPI = {
  getAll(): Promise<Sector[]>
  getByCity(cityName: string): Promise<Sector[]>
  getByPincode(pincode: number): Promise<Sector | null>
  create(sector: SectorFormData): Promise<Sector>
  update(id: string, updates: Partial<Sector>): Promise<Sector>
  delete(id: string): Promise<void>
}
```

#### Slot Management
```typescript
export const deliverySlotAPI = {
  getAvailableSlots(sectorId: string, date: string): Promise<DeliverySlot[]>
  getAll(): Promise<DeliverySlot[]>
  create(slot: SlotFormData): Promise<DeliverySlot>
  update(id: string, updates: Partial<DeliverySlot>): Promise<DeliverySlot>
  delete(id: string): Promise<void>
}
```

#### Order Tracking
```typescript
export const orderPickupAPI = {
  getByDeliveryPartner(partnerId: string, date?: string): Promise<OrderPickup[]>
  updateStatus(id: string, status: PickupStatus, notes?: string): Promise<OrderPickup>
  create(pickup: PickupFormData): Promise<OrderPickup>
}

export const orderDeliveryAPI = {
  getByDeliveryPartner(partnerId: string, date?: string): Promise<OrderDelivery[]>
  updateStatus(id: string, status: DeliveryStatus, notes?: string): Promise<OrderDelivery>
  create(delivery: DeliveryFormData): Promise<OrderDelivery>
}
```

## System Flow

### Customer Flow

1. **Address Selection**: Customer selects delivery address during checkout
2. **Date Selection**: Customer chooses preferred delivery date
3. **Slot Selection**: System displays available slots based on pincode sector
4. **Slot Confirmation**: Customer selects preferred time slot
5. **Order Placement**: Order is placed with slot and timing information

### Admin Flow

1. **Sector Management**: Admin creates sectors and assigns pincodes
2. **Slot Configuration**: Admin sets up delivery slots with timing and capacity
3. **Daily Operations**: Admin monitors slot utilization and availability
4. **Assignment Management**: Admin assigns delivery partners to slots
5. **Route Optimization**: System provides optimized pickup and delivery routes

### Delivery Partner Flow

1. **Slot Assignment**: View assigned slots for current/upcoming dates
2. **Pickup Phase**: 
   - Receive pickup list after cutoff time
   - Visit vendors in optimized order
   - Mark items as picked up
3. **Delivery Phase**:
   - System marks "out for delivery" 45 minutes after cutoff
   - Follow optimized delivery route
   - Mark individual orders as delivered
   - Collect delivery confirmations

### Vendor Flow

1. **Order Preparation**: Receive orders grouped by delivery slots
2. **Preparation Time**: Prepare orders before cutoff time
3. **Pickup Coordination**: Ready orders for delivery partner pickup
4. **Confirmation**: Confirm handover to delivery partner

## Key Features

### 1. Sector-Based Routing
- **Pincode Grouping**: Logical grouping of pincodes into delivery sectors
- **Route Optimization**: Efficient routing within defined zones
- **Scalable Architecture**: Easy addition of new areas and sectors

### 2. Time Slot Management
- **Express Delivery**: 2.5-hour express slots for urgent orders
- **Same Day Delivery**: Standard same-day delivery options
- **Next Day Delivery**: Convenient next-day scheduling
- **Capacity Control**: Maximum order limits per slot

### 3. Real-Time Tracking
- **Multi-Stage Tracking**: Pickup and delivery tracking separately
- **Status Updates**: Real-time status updates for all stakeholders
- **Mobile Integration**: Direct calling and navigation features

### 4. Mobile-First Design
- **Responsive UI**: Optimized for mobile devices
- **Touch-Friendly**: Large touch targets and intuitive navigation
- **Performance**: Fast loading and smooth interactions

## Configuration

### Sample Data

The system includes sample sectors and slots for Patna:

```sql
-- Sample Sectors
INSERT INTO sectors (city_name, name, pincodes) VALUES 
('Patna', 'Dakbunglow Zone', ARRAY[800001, 800002, 800003]),
('Patna', 'Kankarbagh Zone', ARRAY[800020, 800021, 800022]),
('Patna', 'Boring Road Zone', ARRAY[800013, 800014, 800015]);

-- Sample Slots
Morning Express: 10:00 AM - 1:00 PM (Cutoff: 10:00 AM, Pickup: +45 min)
Afternoon Express: 1:30 PM - 4:30 PM (Cutoff: 1:30 PM, Pickup: +45 min)
Evening Express: 5:00 PM - 8:00 PM (Cutoff: 5:00 PM, Pickup: +45 min)
Next Day Morning: 9:00 AM - 12:00 PM (Cutoff: 8:30 PM prev day, Pickup: +12 hrs)
```

## Installation & Setup

### 1. Database Migration
```bash
# Run the migration to create new tables
psql -d your_database -f supabase/migrations/20250703_create_delivery_slot_system.sql
```

### 2. Environment Setup
Ensure your `.env` file includes necessary Supabase configuration:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Component Integration
The slot selection is automatically integrated into the checkout flow. Admin management pages are accessible via:
- `/admin/sectors` - Sector Management
- `/admin/slots` - Slot Management  
- `/delivery/dashboard` - Delivery Partner Dashboard

## Usage Examples

### Creating a Sector
```typescript
const newSector = await sectorAPI.create({
  city_name: "Patna",
  name: "Gandhi Maidan Zone", 
  pincodes: [800004, 800005, 800006],
  is_active: true
});
```

### Checking Slot Availability
```typescript
const availableSlots = await deliverySlotAPI.getAvailableSlots(
  sectorId, 
  "2025-01-08"
);
```

### Updating Pickup Status
```typescript
await orderPickupAPI.updateStatus(
  pickupId, 
  "picked_up", 
  "Items collected successfully"
);
```

## Performance Considerations

### 1. Database Indexing
- Optimized indexes on frequently queried columns
- GIN indexes for array operations (pincodes)
- Composite indexes for date-based queries

### 2. Caching Strategy
- Sector and slot data cached for quick lookups
- Real-time availability calculated on demand
- Optimistic updates for better UX

### 3. Mobile Optimization
- Lazy loading of components
- Minimal data transfer
- Offline capability planning

## Security & Validation

### 1. Input Validation
- Pincode format validation (6-digit numbers)
- Time range validation for slots
- Capacity limit enforcement

### 2. Authorization
- Role-based access for admin functions
- Delivery partner authentication for status updates
- Customer data protection

### 3. Data Integrity
- Foreign key constraints
- Status transition validation
- Duplicate prevention mechanisms

## Future Enhancements

### 1. Advanced Features
- Dynamic pricing based on slot demand
- AI-powered route optimization
- Predictive slot capacity planning
- Customer preference learning

### 2. Integration Options
- Third-party mapping services
- SMS/WhatsApp notifications
- Payment gateway integration
- Analytics and reporting dashboard

### 3. Scalability Improvements
- Multi-city expansion framework
- Microservice architecture migration
- Real-time WebSocket updates
- Advanced caching strategies

## Support & Maintenance

### 1. Monitoring
- Slot utilization tracking
- Delivery performance metrics
- Customer satisfaction monitoring
- System health checks

### 2. Maintenance Tasks
- Regular slot capacity optimization
- Sector boundary adjustments
- Performance tuning
- Data cleanup procedures

---

This slot-based delivery system provides a robust foundation for efficient, scalable delivery operations while maintaining excellent user experience across all stakeholder groups. 