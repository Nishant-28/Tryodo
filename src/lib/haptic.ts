// Haptic feedback utility for mobile devices

export interface HapticOptions {
  duration?: number;
  pattern?: number | number[];
  intensity?: 'light' | 'medium' | 'heavy';
}

/**
 * Provides haptic feedback for button interactions
 * @param options - Haptic feedback options
 */
export const triggerHapticFeedback = (options: HapticOptions = {}) => {
  const { duration = 50, pattern, intensity = 'light' } = options;

  try {
    // Check if the device supports haptic feedback
    if (typeof window !== 'undefined') {
      // Modern Web Vibration API
      if ('vibrate' in navigator) {
        if (pattern) {
          // Use custom pattern if provided
          navigator.vibrate(Array.isArray(pattern) ? pattern : [pattern]);
        } else {
          // Use duration-based vibration
          navigator.vibrate(duration);
        }
        return true;
      }

      // iOS Web App Haptic Feedback (if available)
      if ('webkitRequestAnimationFrame' in window) {
        // Try to trigger iOS haptic feedback through CSS transition hack
        const hapticElement = document.createElement('div');
        hapticElement.style.position = 'fixed';
        hapticElement.style.left = '-9999px';
        hapticElement.style.width = '1px';
        hapticElement.style.height = '1px';
        hapticElement.style.transition = 'transform 0.001s';
        document.body.appendChild(hapticElement);
        
        // Force a reflow and then change transform to trigger haptic on iOS
        hapticElement.offsetHeight;
        hapticElement.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
          document.body.removeChild(hapticElement);
        }, 10);
      }
    }
  } catch (error) {
    console.debug('Haptic feedback not supported:', error);
  }

  return false;
};

/**
 * Predefined haptic patterns for common interactions
 */
export const HapticPatterns = {
  // Button press - short, light vibration
  button: { duration: 30, intensity: 'light' as const },
  
  // Success action - double tap pattern
  success: { pattern: [50, 50, 50], intensity: 'medium' as const },
  
  // Error action - longer vibration
  error: { duration: 200, intensity: 'heavy' as const },
  
  // Navigation - very light tap
  navigation: { duration: 20, intensity: 'light' as const },
  
  // Add to cart - satisfying pattern
  addToCart: { pattern: [80, 30, 80], intensity: 'medium' as const },
  
  // Delete/remove - warning pattern
  delete: { pattern: [100, 50, 100, 50, 100], intensity: 'heavy' as const },
  
  // Quantity change - light double tap
  quantity: { pattern: [30, 20, 30], intensity: 'light' as const },
  
  // Checkout/purchase - celebration pattern
  checkout: { pattern: [50, 30, 50, 30, 100], intensity: 'medium' as const }
};

/**
 * Quick access functions for common haptic patterns
 */
export const hapticFeedback = {
  button: () => triggerHapticFeedback(HapticPatterns.button),
  success: () => triggerHapticFeedback(HapticPatterns.success),
  error: () => triggerHapticFeedback(HapticPatterns.error),
  navigation: () => triggerHapticFeedback(HapticPatterns.navigation),
  addToCart: () => triggerHapticFeedback(HapticPatterns.addToCart),
  delete: () => triggerHapticFeedback(HapticPatterns.delete),
  quantity: () => triggerHapticFeedback(HapticPatterns.quantity),
  checkout: () => triggerHapticFeedback(HapticPatterns.checkout)
};

/**
 * Hook to add haptic feedback to click events
 * @param pattern - Haptic pattern to use
 * @returns Click handler with haptic feedback
 */
export const useHapticClick = (pattern: keyof typeof HapticPatterns = 'button') => {
  return (originalHandler?: (event: any) => void) => {
    return (event: any) => {
      hapticFeedback[pattern]();
      if (originalHandler) {
        originalHandler(event);
      }
    };
  };
}; 