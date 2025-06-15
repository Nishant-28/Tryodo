import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				sm: '2rem',
				lg: '4rem',
				xl: '5rem',
				'2xl': '6rem',
			},
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			'xs': '375px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px',
			// Touch-specific breakpoints
			'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
			'no-touch': { 'raw': '(hover: hover) and (pointer: fine)' },
			// Mobile-specific breakpoints
			'mobile': { 'max': '767px' },
			'mobile-sm': { 'max': '479px' },
			'mobile-lg': { 'min': '480px', 'max': '767px' },
			// Landscape orientation
			'landscape': { 'raw': '(orientation: landscape)' },
			'portrait': { 'raw': '(orientation: portrait)' },
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			spacing: {
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
				// Touch-friendly spacing
				'touch': '44px',
				'touch-sm': '40px',
				'touch-lg': '48px',
			},
			minHeight: {
				'touch': '44px',
				'touch-sm': '40px',
				'touch-lg': '48px',
			},
			minWidth: {
				'touch': '44px',
				'touch-sm': '40px',
				'touch-lg': '48px',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'mobile': '12px',
				'mobile-lg': '16px',
			},
			fontSize: {
				'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
				'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
				'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }],
				'mobile-2xl': ['1.5rem', { lineHeight: '2rem' }],
				'mobile-3xl': ['1.875rem', { lineHeight: '2.25rem' }],
			},
			transitionDuration: {
				'touch': '75ms',
			},
			scale: {
				'98': '0.98',
				'99': '0.99',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'bounce-subtle': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.05)' }
				},
				'press': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(0.98)' },
					'100%': { transform: 'scale(1)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'bounce-subtle': 'bounce-subtle 0.3s ease-out',
				'press': 'press 0.15s ease-out',
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		// Custom plugin for touch-friendly utilities
		function({ addUtilities }: any) {
			addUtilities({
				'.touch-manipulation': {
					'touch-action': 'manipulation',
				},
				'.touch-pan-x': {
					'touch-action': 'pan-x',
				},
				'.touch-pan-y': {
					'touch-action': 'pan-y',
				},
				'.touch-none': {
					'touch-action': 'none',
				},
				'.tap-highlight-none': {
					'-webkit-tap-highlight-color': 'transparent',
				},
				'.tap-highlight': {
					'-webkit-tap-highlight-color': 'rgba(0, 0, 0, 0.1)',
				},
				'.scroll-touch': {
					'-webkit-overflow-scrolling': 'touch',
				},
				'.overscroll-contain': {
					'overscroll-behavior': 'contain',
				},
			})
		}
	],
} satisfies Config;
