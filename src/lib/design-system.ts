/**
 * Melodia Design System Tokens
 * 
 * This file contains all design system tokens and utilities for the Melodia website.
 * It provides a centralized source of truth for colors, typography, spacing, and other design elements.
 */

// Color Tokens
export const colors = {
  // Primary Brand Colors - Light Theme
  primary: {
    yellow: '#FFD166',      // Bright Yellow - CTAs and highlights
    cream: '#FDFDFD',       // Light Cream - Main backgrounds
    coral: '#EF476F',       // Vibrant Coral - Emphasis and notifications
    teal: '#073B4C',        // Dark Teal - Primary text and headings
  },
  
  // Semantic Colors
  semantic: {
    success: '#10B981',     // Green
    warning: '#F59E0B',     // Amber
    error: '#EF4444',       // Red
    info: '#3B82F6',        // Blue
  },
  
  // Neutral Colors
  neutral: {
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
    }
  },
  
  // Opacity Variants
  teal: {
    light: 'rgba(7, 59, 76, 0.1)',
    medium: 'rgba(7, 59, 76, 0.2)',
    dark: 'rgba(7, 59, 76, 0.8)',
  }
} as const;

// Typography Tokens
export const typography = {
  fontFamily: {
    heading: 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.2',
    normal: '1.6',
    relaxed: '1.7',
  }
} as const;

// Spacing Tokens
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
  '5xl': '8rem',   // 128px
} as const;

// Border Radius Tokens
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// Shadow Tokens
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  
  // Melodia-specific shadows
  glow: '0 0 20px rgba(255, 209, 102, 0.3)',
  elegant: '0 4px 6px -1px rgba(7, 59, 76, 0.1), 0 2px 4px -1px rgba(7, 59, 76, 0.06)',
  coral: '0 4px 6px -1px rgba(239, 71, 111, 0.1), 0 2px 4px -1px rgba(239, 71, 111, 0.06)',
  card: '0 1px 3px 0 rgba(7, 59, 76, 0.1), 0 1px 2px 0 rgba(7, 59, 76, 0.06)',
} as const;

// Transition Tokens
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  timing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  }
} as const;

// Gradient Tokens
export const gradients = {
  primary: 'linear-gradient(135deg, #FFD166 0%, #FFC107 50%, #FFB300 100%)',
  secondary: 'linear-gradient(135deg, #FDFDFD 0%, #F8F9FA 50%, #E9ECEF 100%)',
  accent: 'linear-gradient(135deg, #EF476F 0%, #E91E63 50%, #C2185B 100%)',
  warm: 'linear-gradient(135deg, #FFD166 0%, #EF476F 50%, #073B4C 100%)',
} as const;

// Component Tokens
export const components = {
  button: {
    height: {
      sm: '2rem',      // 32px
      md: '2.5rem',    // 40px
      lg: '3rem',      // 48px
    },
    padding: {
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
    },
    borderRadius: borderRadius.lg,
  },
  
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    shadow: shadows.card,
  },
  
  input: {
    height: '2.5rem',  // 40px
    padding: '0.75rem',
    borderRadius: borderRadius.md,
    borderWidth: '1px',
  }
} as const;

// Breakpoint Tokens
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Z-Index Tokens
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Utility Functions
export const getColor = (colorPath: string) => {
  const keys = colorPath.split('.');
  let value: any = colors;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Color path "${colorPath}" not found`);
      return colors.primary.teal;
    }
  }
  
  return value;
};

export const getSpacing = (size: keyof typeof spacing) => spacing[size];
export const getFontSize = (size: keyof typeof typography.fontSize) => typography.fontSize[size];
export const getShadow = (shadow: keyof typeof shadows) => shadows[shadow];
export const getBorderRadius = (radius: keyof typeof borderRadius) => borderRadius[radius];

// Design System Theme Object
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  gradients,
  components,
  breakpoints,
  zIndex,
} as const;

export default theme;
