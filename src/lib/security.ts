// Security utilities and validation functions
import { supabase } from './supabase';

// Input validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[\d\s\-\(\)]{10,15}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  price: /^\d+(\.\d{1,2})?$/,
  positiveInteger: /^[1-9]\d*$/,
  nonNegativeInteger: /^(0|[1-9]\d*)$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  safeText: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
} as const;

// Security error types
export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// Input sanitization functions
export class InputSanitizer {
  /**
   * Sanitize text input to prevent XSS
   */
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize HTML content (basic)
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/gi;
    
    return input.replace(tagRegex, (match, tagName) => {
      return allowedTags.includes(tagName.toLowerCase()) ? match : '';
    });
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number {
    const num = parseFloat(input);
    if (isNaN(num)) throw new SecurityError('Invalid number format', 'INVALID_NUMBER');
    
    if (min !== undefined && num < min) {
      throw new SecurityError(`Number must be at least ${min}`, 'NUMBER_TOO_SMALL');
    }
    
    if (max !== undefined && num > max) {
      throw new SecurityError(`Number must be at most ${max}`, 'NUMBER_TOO_LARGE');
    }
    
    return num;
  }

  /**
   * Sanitize price input
   */
  static sanitizePrice(input: any): number {
    const price = this.sanitizeNumber(input, 0.01, 999999.99);
    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Sanitize UUID
   */
  static sanitizeUuid(input: string): string {
    if (!ValidationPatterns.uuid.test(input)) {
      throw new SecurityError('Invalid UUID format', 'INVALID_UUID');
    }
    return input.toLowerCase();
  }

  /**
   * Sanitize slug
   */
  static sanitizeSlug(input: string): string {
    const slug = input.toLowerCase().trim().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-');
    if (!ValidationPatterns.slug.test(slug)) {
      throw new SecurityError('Invalid slug format', 'INVALID_SLUG');
    }
    return slug;
  }
}

// Input validation functions
export class InputValidator {
  /**
   * Validate email address
   */
  static validateEmail(email: string): boolean {
    return ValidationPatterns.email.test(email);
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): boolean {
    return ValidationPatterns.phone.test(phone);
  }

  /**
   * Validate required fields
   */
  static validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new SecurityError(`${fieldName} is required`, 'FIELD_REQUIRED');
    }
  }

  /**
   * Validate string length
   */
  static validateLength(value: string, min: number, max: number, fieldName: string): void {
    if (value.length < min) {
      throw new SecurityError(`${fieldName} must be at least ${min} characters`, 'STRING_TOO_SHORT');
    }
    if (value.length > max) {
      throw new SecurityError(`${fieldName} must be at most ${max} characters`, 'STRING_TOO_LONG');
    }
  }

  /**
   * Validate marketplace product data
   */
  static validateMarketProductData(data: any): void {
    this.validateRequired(data.name, 'Product name');
    this.validateLength(data.name, 3, 500, 'Product name');
    
    this.validateRequired(data.category_id, 'Category');
    InputSanitizer.sanitizeUuid(data.category_id);
    
    this.validateRequired(data.brand_id, 'Brand');
    InputSanitizer.sanitizeUuid(data.brand_id);
    
    if (data.description) {
      this.validateLength(data.description, 0, 2000, 'Description');
    }
    
    if (data.specifications && typeof data.specifications !== 'object') {
      throw new SecurityError('Specifications must be an object', 'INVALID_SPECIFICATIONS');
    }
  }

  /**
   * Validate vendor product request data
   */
  static validateVendorProductRequest(data: any): void {
    this.validateRequired(data.market_product_id, 'Product');
    InputSanitizer.sanitizeUuid(data.market_product_id);
    
    this.validateRequired(data.proposed_price, 'Price');
    InputSanitizer.sanitizePrice(data.proposed_price);
    
    this.validateRequired(data.stock_quantity, 'Stock quantity');
    InputSanitizer.sanitizeNumber(data.stock_quantity, 0, 999999);
    
    this.validateRequired(data.delivery_time_hours, 'Delivery time');
    InputSanitizer.sanitizeNumber(data.delivery_time_hours, 1, 720); // Max 30 days
    
    if (data.business_justification) {
      this.validateLength(data.business_justification, 0, 1000, 'Business justification');
    }
  }

  /**
   * Validate stock update data
   */
  static validateStockUpdate(data: any): void {
    this.validateRequired(data.stock_quantity, 'Stock quantity');
    const quantity = InputSanitizer.sanitizeNumber(data.stock_quantity, 0, 999999);
    
    if (data.low_stock_threshold !== undefined) {
      InputSanitizer.sanitizeNumber(data.low_stock_threshold, 0, quantity);
    }
  }
}

// Role-based access control
export class AccessControl {
  /**
   * Check if user has required role
   */
  static async checkUserRole(userId: string, requiredRole: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error || !profile) return false;
      
      return profile.role === requiredRole || profile.role === 'admin';
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  /**
   * Check if user is admin
   */
  static async checkAdminAccess(userId: string): Promise<boolean> {
    return this.checkUserRole(userId, 'admin');
  }

  /**
   * Check if user is vendor
   */
  static async checkVendorAccess(userId: string): Promise<boolean> {
    return this.checkUserRole(userId, 'vendor');
  }

  /**
   * Check if user owns vendor account
   */
  static async checkVendorOwnership(userId: string, vendorId: string): Promise<boolean> {
    try {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('profile_id')
        .eq('id', vendorId)
        .single();

      if (error || !vendor) return false;
      
      return vendor.profile_id === userId;
    } catch (error) {
      console.error('Error checking vendor ownership:', error);
      return false;
    }
  }

  /**
   * Check if user can modify marketplace product
   */
  static async checkMarketProductAccess(userId: string, productId: string): Promise<boolean> {
    try {
      // Only admins can modify market products
      return this.checkAdminAccess(userId);
    } catch (error) {
      console.error('Error checking market product access:', error);
      return false;
    }
  }

  /**
   * Check if user can modify vendor product
   */
  static async checkVendorProductAccess(userId: string, vendorProductId: string): Promise<boolean> {
    try {
      const { data: vendorProduct, error } = await supabase
        .from('market_vendor_products')
        .select('vendor_id')
        .eq('id', vendorProductId)
        .single();

      if (error || !vendorProduct) return false;
      
      // Check if user owns the vendor account or is admin
      const isOwner = await this.checkVendorOwnership(userId, vendorProduct.vendor_id);
      const isAdmin = await this.checkAdminAccess(userId);
      
      return isOwner || isAdmin;
    } catch (error) {
      console.error('Error checking vendor product access:', error);
      return false;
    }
  }
}

// Price manipulation prevention
export class PriceProtection {
  /**
   * Validate price changes to prevent manipulation
   */
  static async validatePriceChange(
    vendorProductId: string,
    newPrice: number,
    userId: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      // Get current price and recent price history
      const { data: currentProduct, error } = await supabase
        .from('market_vendor_products')
        .select('price, updated_at, vendor_id')
        .eq('id', vendorProductId)
        .single();

      if (error || !currentProduct) {
        return { valid: false, reason: 'Product not found' };
      }

      // Check ownership
      const hasAccess = await AccessControl.checkVendorProductAccess(userId, vendorProductId);
      if (!hasAccess) {
        return { valid: false, reason: 'Access denied' };
      }

      const currentPrice = currentProduct.price;
      const priceChange = Math.abs(newPrice - currentPrice);
      const priceChangePercent = (priceChange / currentPrice) * 100;

      // Prevent extreme price changes (more than 50% in a single update)
      if (priceChangePercent > 50) {
        return { 
          valid: false, 
          reason: 'Price change exceeds 50% limit. Please contact support for large price adjustments.' 
        };
      }

      // Check for rapid price changes (more than 3 changes in 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentChanges } = await supabase
        .from('market_vendor_products')
        .select('*', { count: 'exact', head: true })
        .eq('id', vendorProductId)
        .gte('updated_at', oneDayAgo);

      if (recentChanges && recentChanges > 3) {
        return { 
          valid: false, 
          reason: 'Too many price changes in 24 hours. Please wait before making another change.' 
        };
      }

      // Validate price is reasonable (not too low to prevent dumping)
      if (newPrice < 1) {
        return { valid: false, reason: 'Price must be at least ₹1' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating price change:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Log suspicious price activities
   */
  static async logSuspiciousActivity(
    vendorId: string,
    activity: string,
    details: any
  ): Promise<void> {
    try {
      await supabase
        .from('security_logs')
        .insert({
          vendor_id: vendorId,
          activity_type: 'price_manipulation',
          activity_description: activity,
          details: details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging suspicious activity:', error);
    }
  }
}

// Rate limiting
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if request is within rate limit
   */
  static checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier);

    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (userRequests.count >= maxRequests) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// SQL injection prevention utilities
export class SQLSafety {
  /**
   * Escape SQL identifiers
   */
  static escapeIdentifier(identifier: string): string {
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Validate SQL parameters
   */
  static validateSQLParams(params: any[]): boolean {
    return params.every(param => {
      if (typeof param === 'string') {
        // Check for SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
          /(--|\/\*|\*\/|;)/,
          /(\b(OR|AND)\b.*=.*)/i
        ];
        return !sqlPatterns.some(pattern => pattern.test(param));
      }
      return true;
    });
  }
}

// Content Security Policy helpers
export class CSPHelper {
  /**
   * Generate CSP header for marketplace pages
   */
  static generateCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }
}

// Security audit logging
export class SecurityAudit {
  /**
   * Log security events
   */
  static async logSecurityEvent(
    eventType: string,
    userId: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: eventType,
          user_id: userId,
          details: details,
          severity: severity,
          ip_address: '', // Would be populated by server
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  /**
   * Log failed authentication attempts
   */
  static async logFailedAuth(email: string, reason: string): Promise<void> {
    await this.logSecurityEvent('failed_auth', '', {
      email: email,
      reason: reason
    }, 'medium');
  }

  /**
   * Log suspicious marketplace activity
   */
  static async logSuspiciousMarketplaceActivity(
    userId: string,
    activity: string,
    details: any
  ): Promise<void> {
    await this.logSecurityEvent('suspicious_marketplace_activity', userId, {
      activity: activity,
      details: details
    }, 'high');
  }
}