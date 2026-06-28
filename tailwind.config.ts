import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: "class",
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
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				// Joyful Jam Session Brand Colors
				'primary-yellow': '#FFD166',
				'secondary-cream': '#FDFDFD',
				'accent-coral': '#EF476F',
				'text-teal': '#073B4C',
				'surface-container-lowest': '#ffffff',
				'surface-container-low': '#f6f3ec',
				'surface-container': '#f0eee7',
				'surface-container-high': '#ebe8e1',
				'surface-container-highest': '#e5e2db',
				'on-surface-variant': '#4e4636',
				'on-surface': '#1c1c18',
				'paper-white': '#fcf9f2',
				'outline-variant': '#d1c5b1',

				// Semantic Colors
				success: {
					DEFAULT: '#10B981',
					foreground: '#FFFFFF',
				},
				warning: {
					DEFAULT: '#F59E0B',
					foreground: '#FFFFFF',
				},
				error: '#EF4444',
				info: '#3B82F6',

				// Neutral Colors
				white: '#FFFFFF',
				gray: {
					50: '#F9FAFB',
					100: '#F3F4F6',
					200: '#E5E7EB',
					300: '#D1D5DB',
					400: '#9CA3AF',
					500: '#6B7280',
					600: '#4B5563',
					700: '#374151',
					800: '#1F2937',
					900: '#111827',
				},

				// Tailwind CSS Variables (for shadcn/ui compatibility)
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
			fontFamily: {
				'heading': ['Poppins', 'sans-serif'],
				'body': ['Montserrat', 'sans-serif'],
				'sans': ['Montserrat', 'sans-serif'],
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-accent': 'var(--gradient-accent)'
			},
			boxShadow: {
				'glow': 'var(--shadow-glow)',
				'elegant': 'var(--shadow-elegant)'
			},
			transitionTimingFunction: {
				'smooth': 'var(--transition-smooth)',
				'bounce': 'var(--transition-bounce)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
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
				'spin-reel': {
					'0%': { transform: 'translateY(0%)' },
					'20%': { transform: 'translateY(-20%)' },
					'40%': { transform: 'translateY(-40%)' },
					'60%': { transform: 'translateY(-60%)' },
					'80%': { transform: 'translateY(-80%)' },
					'100%': { transform: 'translateY(-100%)' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 5px hsl(263 70% 50% / 0.3)' },
					'50%': { boxShadow: '0 0 20px hsl(263 70% 50% / 0.6)' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px) rotate(0deg)', opacity: '0.1' },
					'25%': { transform: 'translateY(-10px) rotate(5deg)', opacity: '0.3' },
					'50%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '0.2' },
					'75%': { transform: 'translateY(-10px) rotate(-5deg)', opacity: '0.3' }
				},
				'wave': {
					'0%, 100%': { transform: 'translateX(0) scaleY(1)' },
					'25%': { transform: 'translateX(-5px) scaleY(1.1)' },
					'50%': { transform: 'translateX(0) scaleY(1)' },
					'75%': { transform: 'translateX(5px) scaleY(0.9)' }
				},
				'shimmer': {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				'bounce-gentle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'spin-reel': 'spin-reel 3s ease-in-out infinite',
				'fade-in': 'fade-in 0.6s ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'float': 'float 6s ease-in-out infinite',
				'wave': 'wave 8s ease-in-out infinite',
				'shimmer': 'shimmer 3s ease-in-out infinite',
				'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};

export default config;
