// Colors inspired by Iraqi heritage from the provided image
export const Colors = {
  // Primary colors from the heritage image
  primary: '#D4AF37',        // Gold from architecture
  primaryDark: '#B8860B',    // Darker gold
  primaryLight: '#FFD700',   // Bright gold
  
  secondary: '#40E0D0',      // Turquoise from domes
  secondaryDark: '#20B2AA',  // Dark turquoise
  secondaryLight: '#AFEEEE', // Light turquoise
  
  accent: '#CD7F32',         // Bronze from metalwork
  accentLight: '#DEB887',    // Light bronze
  
  // Earth tones from the desert landscape
  sandy: '#F4A460',          // Sandy brown
  beige: '#F5F5DC',          // Light beige
  earth: '#8B4513',          // Saddle brown
  
  // Neutral colors
  white: '#FFFFFF',
  lightGray: '#F8F8F8',
  gray: '#E8E8E8',
  mediumGray: '#999999',
  darkGray: '#666666',
  black: '#1A1A1A',
  
  // Status colors
  success: '#00C853',        // Keep existing green for success
  warning: '#FF9800',        // Orange for warnings
  error: '#F44336',          // Red for errors
  info: '#2196F3',           // Blue for info
  
  // Background colors
  background: '#FEFEFE',     // Very light background
  cardBackground: '#FFFFFF',
  sectionBackground: '#FAF8F5', // Warm light background
  
  // Text colors
  textPrimary: '#2C1810',    // Dark brown for primary text
  textSecondary: '#5D4E37',  // Medium brown for secondary text
  textLight: '#8B7355',      // Light brown for subtle text
  textOnDark: '#FFFFFF',     // White text on dark backgrounds
  
  // Transportation specific colors
  pickup: '#2196F3',         // Blue for pickup points
  destination: '#F44336',    // Red for destinations
  route: '#00C853',          // Green for routes
  delivery: '#FF6B35',       // Orange for delivery
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Shadows = {
  small: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};