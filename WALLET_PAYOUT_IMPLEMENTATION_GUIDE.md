# Integrated Wallet & Payout System Implementation Guide

## Overview

This guide provides a complete implementation of an integrated wallet and payout system that combines your existing `payouts` table with a new `vendor_wallets` table for comprehensive financial management.

## 🚀 Quick Start

### 1. Database Setup

Run the SQL script to create the integrated system:

```sql
-- Execute integrated_payout_wallet_system.sql
-- This creates the vendor_wallets table and all necessary functions
```

### 2. API Integration

The system provides two main API classes:

- **`WalletAPI`** - Manages vendor wallet data and balance calculations
- **`PayoutAPI`** - Handles payout requests and admin management

### 3. Component Integration

#### For Vendor Dashboard:
```tsx
import VendorWalletPayoutSection from './VendorWalletPayoutSection';

// In your VendorDashboard component
<VendorWalletPayoutSection 
  vendorId={vendorData.id} 
  onRefresh={handleRefresh}
/>
```

#### For Admin Dashboard:
```tsx
import AdminPayoutDashboard from './AdminPayoutDashboard';

// In your AdminDashboard component
<AdminPayoutDashboard />
```

## 📊 System Architecture

### Database Schema

```
vendor_wallets
├── id (UUID, Primary Key)
├── vendor_id (UUID, Foreign Key → vendors.id)
├── available_balance (DECIMAL) - Ready for payout
├── pending_balance (DECIMAL) - Awaiting delivery
├── total_earned (DECIMAL) - Lifetime earnings
├── total_paid_out (DECIMAL) - Total payouts completed
├── today_earnings (DECIMAL) - Today's earnings
├── week_earnings (DECIMAL) - This week's earnings
├── month_earnings (DECIMAL) - This month's earnings
├── total_commission_paid (DECIMAL) - Total commission deducted
├── minimum_payout_amount (DECIMAL) - Minimum payout threshold
├── payout_frequency (VARCHAR) - daily/weekly/monthly
├── auto_payout_enabled (BOOLEAN) - Auto payout setting
├── bank_account_number (VARCHAR) - Bank account
├── bank_ifsc_code (VARCHAR) - IFSC code
├── bank_account_holder_name (VARCHAR) - Account holder name
├── upi_id (VARCHAR) - UPI ID
└── ... audit fields
```

### Integration with Existing Payouts Table

The system seamlessly integrates with your existing `payouts` table:

- **Wallet balances** are calculated from `order_items` and `payouts`
- **Payout requests** are created in the `payouts` table
- **Balance updates** happen automatically via triggers
- **Admin management** uses existing payout workflows

## 🔧 Key Features

### 1. Real-time Balance Calculation

```typescript
// Automatic balance sync when orders change
const wallet = await WalletAPI.getVendorWalletData(vendorId);
// Returns: available_balance, pending_balance, total_earned, etc.
```

### 2. Payout Request System

```typescript
// Vendor requests payout
const response = await WalletAPI.requestPayout(vendorId, amount, 'bank_transfer');
// Creates entry in payouts table with 'pending' status
```

### 3. Admin Payout Management

```typescript
// Admin processes payout
const response = await PayoutAPI.processPayout(payoutId, adminUserId);
// Updates payout status to 'completed' and syncs wallet balance
```

### 4. Automated Triggers

- **Order Status Changes** → Automatic wallet balance sync
- **Payout Completions** → Automatic balance updates
- **Data Consistency** → Maintained via database triggers

## 💡 Implementation Steps

### Step 1: Database Migration

1. **Run the SQL script:**
   ```bash
   psql -d your_database -f integrated_payout_wallet_system.sql
   ```

2. **Verify tables created:**
   ```sql
   \dt vendor_wallets
   \df sync_vendor_wallet_balance
   ```

### Step 2: API Integration

1. **Update your existing API file:**
   - The `PayoutAPI` class has been updated with full functionality
   - The `WalletAPI` class now integrates with the database

2. **Test API endpoints:**
   ```typescript
   // Test wallet data retrieval
   const wallet = await WalletAPI.getVendorWalletData(vendorId);
   
   // Test payout creation
   const payout = await PayoutAPI.createPayoutRequest(vendorId, 1000);
   ```

### Step 3: Component Integration

1. **Add to Vendor Dashboard:**
   ```tsx
   // Add wallet section to vendor dashboard
   <VendorWalletPayoutSection vendorId={vendor.id} />
   ```

2. **Add to Admin Dashboard:**
   ```tsx
   // Add payout management to admin dashboard
   <AdminPayoutDashboard />
   ```

### Step 4: Testing & Validation

1. **Test wallet balance calculation:**
   - Create test orders with different statuses
   - Verify wallet balances update correctly

2. **Test payout workflow:**
   - Create payout request as vendor
   - Process payout as admin
   - Verify balance updates

## 🎯 Benefits

### For Vendors:
- **Real-time balance tracking** with detailed breakdowns
- **Easy payout requests** with bank/UPI integration
- **Payout history** and status tracking
- **Customizable payout settings** (minimum amount, frequency)

### For Admins:
- **Comprehensive payout dashboard** with statistics
- **Batch payout processing** capabilities
- **Financial oversight** with detailed analytics
- **Automated balance reconciliation**

### For System:
- **Data consistency** via database triggers
- **Scalable architecture** with proper indexing
- **Audit trail** for all financial transactions
- **Integration** with existing order system

## 🔒 Security Features

- **Row Level Security (RLS)** for vendor wallet access
- **Admin-only payout processing** with user tracking
- **Audit logging** for all financial operations
- **Data validation** at API and database levels

## 📈 Performance Optimizations

- **Database indexes** on frequently queried fields
- **Efficient triggers** for balance updates
- **Caching strategies** for wallet data
- **Batch processing** for large-scale operations

## 🛠️ Maintenance

### Regular Tasks:
1. **Sync wallet balances** (automated via triggers)
2. **Monitor payout processing** times
3. **Review financial discrepancies**
4. **Update commission rates** as needed

### Monitoring:
- **Wallet balance accuracy** vs order data
- **Payout processing times**
- **Failed payout attempts**
- **System performance metrics**

## 🚨 Important Notes

1. **Data Migration:** Existing vendors will get wallet records created automatically
2. **Balance Accuracy:** Initial sync ensures all historical data is included
3. **Payout Integration:** Uses existing payout table structure
4. **Commission Calculation:** Currently set to 15% (configurable)

## 📞 Support

For implementation questions or issues:
1. Check the database function comments
2. Review API response messages
3. Monitor application logs
4. Test with small amounts first

This integrated system provides a robust foundation for vendor financial management while maintaining compatibility with your existing payout infrastructure. 