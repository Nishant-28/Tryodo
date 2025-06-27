import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Add haptic feedback utility
const triggerHapticFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 30,
      medium: 50,
      heavy: 80
    }
    navigator.vibrate(patterns[intensity])
  }
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/95 active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80 active:scale-[0.98]",
        // Mobile-optimized variants
        "primary-mobile": "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 active:scale-[0.96] transition-all duration-150",
        "success-mobile": "bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold shadow-lg hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 active:scale-[0.96]",
        "danger-mobile": "bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold shadow-lg hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 active:scale-[0.96]",
        "outline-mobile": "border-2 border-gray-300 bg-white text-gray-700 font-medium shadow-sm hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 active:scale-[0.96]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        // Enhanced mobile-optimized sizes with proper touch targets
        "mobile-xs": "h-10 px-3 py-2 text-sm min-h-[40px] min-w-[40px]",
        "mobile-sm": "h-12 px-4 py-3 text-base min-h-[48px] min-w-[48px] rounded-xl",
        "mobile-md": "h-14 px-6 py-4 text-base min-h-[56px] min-w-[56px] rounded-xl",
        "mobile-lg": "h-16 px-8 py-5 text-lg min-h-[64px] min-w-[64px] rounded-xl",
        "mobile-xl": "h-18 px-10 py-6 text-xl min-h-[72px] min-w-[72px] rounded-2xl",
        // Icon sizes for mobile
        "mobile-icon-sm": "h-12 w-12 min-h-[48px] min-w-[48px] rounded-xl",
        "mobile-icon-md": "h-14 w-14 min-h-[56px] min-w-[56px] rounded-xl",
        "mobile-icon-lg": "h-16 w-16 min-h-[64px] min-w-[64px] rounded-xl",
        // Full width mobile buttons
        "mobile-full": "h-14 w-full px-6 py-4 text-base min-h-[56px] rounded-xl",
        "mobile-full-lg": "h-16 w-full px-8 py-5 text-lg min-h-[64px] rounded-xl",
      },
      // Add touch feedback intensity
      feedback: {
        none: "",
        light: "",
        medium: "",
        heavy: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      feedback: "light",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  enableHaptics?: boolean
  hapticIntensity?: 'light' | 'medium' | 'heavy'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, enableHaptics = true, hapticIntensity = 'light', onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback if enabled
      if (enableHaptics) {
        triggerHapticFeedback(hapticIntensity)
      }
      
      // Call the original onClick handler
      if (onClick) {
        onClick(e)
      }
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
