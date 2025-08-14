## Delivery UI/UX and API Guide

This document summarizes the Delivery dashboards, the Delivery API surface, and the UI/UX patterns used across delivery features. It includes concrete examples of components and code to help you extend or troubleshoot the delivery experience.

### Key Files
- `src/pages/DeliveryPartnerDashboard.tsx`: Slot-based, production delivery workflow for partners.
- `src/pages/DeliveryBoyDashboard.tsx`: Simplified pickup/delivery workflow by date.
- `src/lib/deliveryApi.ts`: Delivery domain API (stats, assignments, pickups, deliveries, cancellation, utilities).
- `src/components/ui/*`: Reusable UI primitives (Button, Card, Badge, Tabs, Dialog, Select, Progress, Switch, etc.).

## Delivery API Overview

The Delivery API in `src/lib/deliveryApi.ts` provides endpoints and helpers to power the delivery dashboards.

### Core Types
- `DeliveryStats` (key fields):
  - `today_deliveries`, `week_deliveries`, `month_deliveries`, `total_deliveries`, `successful_deliveries`
  - `today_earnings`, `week_earnings`, `month_earnings`, `total_earnings`
  - `average_rating`, `total_distance?`, `average_delivery_time?`, `active_orders`, `last_delivery_at?`

### Primary Methods (selected)
- High-level
  - `DeliveryAPI.getDeliveryStats(deliveryPartnerId)` → Fetch aggregate metrics per partner
  - `DeliveryAPI.updateAvailabilityStatus(deliveryPartnerId, isAvailable)` → Toggle partner availability
  - `DeliveryAPI.ensureOrderDeliveryPartnerAssignment(orderId, deliveryPartnerId)` → Ensure assignment row exists
- Pickups and Deliveries
  - `DeliveryAPI.markVendorPickedUp(orderId, vendorId, deliveryPartnerId)` → Mark vendor pickup and update order + DPO state
  - `DeliveryAPI.markDelivered(orderId, deliveryPartnerId)` → Mark delivered; finalize assignment/slot statuses
  - `deliveryAssignmentAPI.getByPartner(deliveryPartnerId, date?)` → Fetch slot assignments for partner/date
  - `orderPickupAPI.getByDeliveryPartner(deliveryPartnerId, date?)` → Fetch pickups by partner/date
  - `orderDeliveryAPI.getByDeliveryPartner(deliveryPartnerId, date?)` → Fetch deliveries by partner/date
  - `orderPickupAPI.updateStatus(id, status, notes?)` / `orderDeliveryAPI.updateStatus(id, status, notes?)`
- Cancellation
  - `DeliveryAPI.cancelOrder(orderId, deliveryPartnerId, reason, additionalDetails?)` → Transactional cancel flow
  - `DeliveryAPI.canCancelOrder(orderId, deliveryPartnerId)` → Guard checks before cancel

### Supabase Tables Touched (non-exhaustive)
- `orders`, `order_items`, `order_pickups`, `order_deliveries`, `delivery_partner_orders`
- `delivery_assignments`, `delivery_partner_sector_assignments`, `delivery_slots`, `sectors`
- `delivery_partners`, `delivery_partner_stats`, `order_cancellations`

## DeliveryPartnerDashboard UI/UX

A mobile-first, slot-based workflow guiding delivery partners from vendor pickups to customer deliveries, with availability control and integrated cancellation.

### Data Loading Flow
- On mount for `delivery_partner` users:
  - Fetch partner record by `profile_id` (availability, verification, rating, etc.).
  - Load slot-based orders: combine `delivery_partner_sector_assignments` and `delivery_assignments`, filter/augment with orders, pickups, vendors, and computed progress.
  - Load stats (`DeliveryAPI.getDeliveryStats`).
  - Load recent delivered orders for history.
- Auto-refresh every 30s when not loading.

### Key UI Elements
- Header: `Header`
- Availability: `Switch` control updating via `DeliveryAPI.updateAvailabilityStatus`
- Tabs: `Tabs` with "My Orders" (active slots) and "Delivered" (history)
- Cards and Layout: `Card`, `CardHeader`, `CardContent`, `Badge`, `Separator`
- Progress: `Progress` for pickup/delivery completion per slot
- Actions: `Button` for Navigate, Call, Mark Picked Up, Start Delivery, Mark Delivered
- Notifications: `sonner` `toast` feedback on actions
- Icons: `lucide-react` (Truck, Package, Phone, Route, CheckCircle, Clock, MapPin, etc.)

### UX Flows
- Vendor Pickup
  - Ensure assignment exists; ensure/create `order_pickups` rows; update `pickup_status` and times.
  - When all vendors picked, order becomes `picked_up`; `delivery_partner_orders` moves to `picked_up`.
- Start Delivery
  - Move `orders.order_status` to `out_for_delivery` (auto-set from `picked_up` if needed) and update `delivery_partner_orders`.
- Mark Delivered
  - `DeliveryAPI.markDelivered` finalizes delivery, updates assignment status and slot completion if all orders delivered.
- Cancellation
  - From an out-for-delivery order, open `OrderCancellationModal` and call `DeliveryAPI.cancelOrder`.

### Example: Availability Toggle
```tsx
import { Switch } from '@/components/ui/switch';
import { DeliveryAPI } from '@/lib/deliveryApi';

<Switch
  id="availability"
  checked={isAvailable}
  onCheckedChange={async (available) => {
    const res = await DeliveryAPI.updateAvailabilityStatus(deliveryPartner.id, available);
    if (res.success) setIsAvailable(available);
  }}
/>
```

### Example: Vendor Pickup Action
```tsx
import { Button } from '@/components/ui/button';
import { DeliveryAPI } from '@/lib/deliveryApi';

<Button
  size="sm"
  onClick={async () => {
    const res = await DeliveryAPI.markVendorPickedUp(orderId, vendorId, deliveryPartner.id);
    if (res.success) toast.success('Picked up'); else toast.error(res.error);
  }}
>
  Mark Picked Up
</Button>
```

### Example: Customer Delivery Actions
```tsx
<Button onClick={() => handleStartDelivery(orderId)}>Start Delivery</Button>
<Button onClick={() => DeliveryAPI.markDelivered(orderId, deliveryPartner.id)}>Mark Delivered</Button>
```

### Example: Slot Card Composition
```tsx
<Card>
  <CardHeader>
    <div className="flex items-center gap-3">
      <h3 className="text-lg font-bold">{slot.slot_name}</h3>
      <Badge className="text-xs">{slot.status.toUpperCase()}</Badge>
    </div>
    <div className="grid grid-cols-2 gap-3 mt-2">
      <div>
        <div className="flex justify-between text-xs">
          <span>Pickup</span><span>{slot.pickup_progress}%</span>
        </div>
        <Progress value={slot.pickup_progress} className="h-2" />
      </div>
      <div>
        <div className="flex justify-between text-xs">
          <span>Delivery</span><span>{slot.delivery_progress}%</span>
        </div>
        <Progress value={slot.delivery_progress} className="h-2" />
      </div>
    </div>
  </CardHeader>
  <CardContent>{/* vendors + deliveries lists */}</CardContent>
</Card>
```

## DeliveryBoyDashboard UI/UX

A simpler date-scoped view showing pickups and deliveries with status transitions and notes.

### Data Loading Flow
- User selects a date (`Select` control)
- Loads in parallel:
  - `deliveryAssignmentAPI.getByPartner(partnerId, selectedDate)`
  - `orderPickupAPI.getByDeliveryPartner(partnerId, selectedDate)`
  - `orderDeliveryAPI.getByDeliveryPartner(partnerId, selectedDate)`

### Key UI Elements
- Header: `Header`
- Date Picker: `Select` with prebuilt date options (yesterday … tomorrow)
- Tabs: `Tabs` for "Pickups" and "Deliveries"
- Lists: `Card` per pickup/delivery with badges for statuses, vendor and address blocks, and contact actions
- Status Modal: `Dialog` to confirm and add optional notes when marking as picked up/delivered

### Status Update Patterns
```tsx
// Pickups
await orderPickupAPI.updateStatus(pickupId, 'en_route');
await orderPickupAPI.updateStatus(pickupId, 'picked_up', notes);

// Deliveries
await orderDeliveryAPI.updateStatus(deliveryId, 'out_for_delivery');
await orderDeliveryAPI.updateStatus(deliveryId, 'delivered', notes);
```

### Example: Status Confirmation Dialog
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm {type === 'pickup' ? 'Pickup' : 'Delivery'}</DialogTitle>
    </DialogHeader>
    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={onConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## UI Components Used
- Core: `Button`, `Card`, `Badge`, `Tabs`, `Dialog`, `Textarea`, `Select`, `Alert`, `Progress`, `Switch`, `Separator`, `ScrollArea`, `Sheet`
- Icons: `lucide-react` (`Truck`, `Package`, `Phone`, `Route`, `MapPin`, `Clock`, `CheckCircle`, `AlertTriangle`, etc.)
- Utilities: `cn` (className merge), `toast` from `sonner` or `use-toast`

## Interaction and UX Notes
- Optimistic UI: Local state is updated after successful API calls; errors produce `toast` destructive messages.
- Mobile-first: Grid/touch friendly buttons; responsive `TabsList`; condensed card content with key actions.
- Navigation/Calls: `window.open('tel:...')` for calls; `window.open(navigation_url)` for maps.
- Progress indicators: Use `Progress` to show pickup/delivery completion at slot level.
- Guard rails: Use `DeliveryAPI.canCancelOrder` and per-status checks to enable/disable actions.
- Auto-refresh: 30s interval refresh when partner is loaded.

## Extending the Delivery UI
- Add a new status step:
  - Update server-side transitions (tables: `orders`, `delivery_partner_orders`).
  - Expose a method in `deliveryApi.ts` and call from the dashboard.
  - Add a `Button` + `Badge` state mapping, and update progress calculations if applicable.
- Add analytics:
  - Extend `DeliveryStats`; backfill `delivery_partner_stats` view/table.
  - Render via additional `Card` + small `Progress` or charts.

## Common Pitfalls
- Missing `delivery_partner_orders` rows → use `DeliveryAPI.ensureOrderDeliveryPartnerAssignment` when loading/starting flows.
- Multi-vendor orders: allow subsequent pickups even when assignment already moved to `picked_up`.
- Time windows: filter expired slots with buffer; ensure today vs yesterday slots logic.
- Cancellation: only allow when `pending` or `out_for_delivery` (as designed); provide clear feedback via modal.

## Quick References
- Fetch stats: `DeliveryAPI.getDeliveryStats(deliveryPartnerId)`
- Toggle availability: `DeliveryAPI.updateAvailabilityStatus(partnerId, bool)`
- Ensure assignment: `DeliveryAPI.ensureOrderDeliveryPartnerAssignment(orderId, partnerId)`
- Vendor pickup: `DeliveryAPI.markVendorPickedUp(orderId, vendorId, partnerId)`
- Start delivery: set `orders.order_status = out_for_delivery` and update `delivery_partner_orders`
- Mark delivered: `DeliveryAPI.markDelivered(orderId, partnerId)`
- Cancel order: `DeliveryAPI.cancelOrder(orderId, partnerId, reason, details?)` 