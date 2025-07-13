// Updated WalletAPI to use database table
export class WalletAPI {
  /**
   * Get vendor wallet data from database
   */
  static async getVendorWalletData(vendorId: string): Promise<ApiResponse<any>> {
    try {
      // First try to get from database
      const { data: wallet, error } = await supabase
        .from('vendor_wallets')
        .select('*')
        .eq('vendor_id', vendorId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      // If no wallet exists, create one
      if (!wallet) {
        // Sync wallet balance from orders
        await this.syncWalletBalance(vendorId);
        
        // Try to get again
        const { data: newWallet, error: newError } = await supabase
          .from('vendor_wallets')
          .select('*')
          .eq('vendor_id', vendorId)
          .single();

        if (newError) throw newError;
        
        return {
          success: true,
          data: newWallet,
          message: 'Vendor wallet created and retrieved successfully'
        };
      }

      // Check if wallet data is stale (older than 5 minutes)
      const lastUpdated = new Date(wallet.last_updated_balance_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (lastUpdated < fiveMinutesAgo) {
        // Sync wallet balance in background
        this.syncWalletBalance(vendorId).catch(console.error);
      }

      return {
        success: true,
        data: wallet,
        message: 'Vendor wallet retrieved successfully'
      };

    } catch (error: any) {
      console.error('Error getting vendor wallet data:', error);
      return {
        success: false,
        error: error.message || 'Failed to get vendor wallet data',
        data: null
      };
    }
  }

  /**
   * Sync wallet balance with order data
   */
  static async syncWalletBalance(vendorId: string): Promise<ApiResponse<any>> {
    try {
      // Call the database function to sync wallet balance
      const { data, error } = await supabase.rpc('sync_vendor_wallet_balance', {
        p_vendor_id: vendorId
      });

      if (error) throw error;

      return {
        success: true,
        data: null,
        message: 'Wallet balance synchronized successfully'
      };

    } catch (error: any) {
      console.error('Error syncing wallet balance:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync wallet balance'
      };
    }
  }

  /**
   * Update wallet payout settings
   */
  static async updateWalletSettings(
    vendorId: string,
    settings: {
      minimum_payout_amount?: number;
      payout_frequency?: 'daily' | 'weekly' | 'monthly';
      auto_payout_enabled?: boolean;
      bank_account_number?: string;
      bank_ifsc_code?: string;
      bank_account_holder_name?: string;
      upi_id?: string;
    }
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('vendor_wallets')
        .update(settings)
        .eq('vendor_id', vendorId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data,
        message: 'Wallet settings updated successfully'
      };

    } catch (error: any) {
      console.error('Error updating wallet settings:', error);
      return {
        success: false,
        error: error.message || 'Failed to update wallet settings'
      };
    }
  }

  /**
   * Get vendor wallet (for backward compatibility)
   */
  static async getVendorWallet(vendorId: string): Promise<ApiResponse<any>> {
    return this.getVendorWalletData(vendorId);
  }

  /**
   * Process payout for vendor
   */
  static async processPayout(
    vendorId: string,
    amount: number,
    payoutMethod: 'bank_transfer' | 'upi' = 'bank_transfer'
  ): Promise<ApiResponse<any>> {
    try {
      // Get current wallet
      const walletResponse = await this.getVendorWalletData(vendorId);
      if (!walletResponse.success) {
        throw new Error(walletResponse.error);
      }

      const wallet = walletResponse.data;
      
      // Check if sufficient balance
      if (wallet.available_balance < amount) {
        return {
          success: false,
          error: 'Insufficient balance for payout'
        };
      }

      // Check minimum payout amount
      if (amount < wallet.minimum_payout_amount) {
        return {
          success: false,
          error: `Minimum payout amount is ₹${wallet.minimum_payout_amount}`
        };
      }

      // Update wallet balances
      const { data, error } = await supabase
        .from('vendor_wallets')
        .update({
          available_balance: wallet.available_balance - amount,
          total_paid_out: wallet.total_paid_out + amount,
          last_payout_date: new Date().toISOString()
        })
        .eq('vendor_id', vendorId)
        .select()
        .single();

      if (error) throw error;

      // Here you would integrate with payment gateway
      // For now, we'll just return success
      
      return {
        success: true,
        data: {
          payout_amount: amount,
          payout_method: payoutMethod,
          remaining_balance: data.available_balance,
          payout_date: data.last_payout_date
        },
        message: 'Payout processed successfully'
      };

    } catch (error: any) {
      console.error('Error processing payout:', error);
      return {
        success: false,
        error: error.message || 'Failed to process payout'
      };
    }
  }

  /**
   * Get payout history for vendor
   */
  static async getPayoutHistory(vendorId: string): Promise<ApiResponse<any[]>> {
    try {
      // This would query a payout_history table if you create one
      // For now, return empty array
      return {
        success: true,
        data: [],
        message: 'Payout history retrieved (empty - implement payout_history table)'
      };

    } catch (error: any) {
      console.error('Error getting payout history:', error);
      return {
        success: false,
        error: error.message || 'Failed to get payout history'
      };
    }
  }

  /**
   * Sync all vendor wallets (admin function)
   */
  static async syncAllWallets(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.rpc('sync_all_vendor_wallets');

      if (error) throw error;

      return {
        success: true,
        data: null,
        message: 'All vendor wallets synchronized successfully'
      };

    } catch (error: any) {
      console.error('Error syncing all wallets:', error);
      return {
        success: false,
        error: error.message || 'Failed to sync all wallets'
      };
    }
  }
} 