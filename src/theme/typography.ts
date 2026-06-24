import { Platform } from 'react-native';

const BASE_FONT = Platform.select({ ios: 'SF Pro Display', android: 'Roboto', default: 'System' });
const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const Typography = {
  fonts: {
    regular: BASE_FONT,
    mono:    MONO_FONT,
  },

  size: {
    xs:   10,
    sm:   12,
    base: 14,
    md:   16,
    lg:   18,
    xl:   22,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
  },

  weight: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    heavy:    '800' as const,
  },

  lineHeight: {
    tight:  1.2,
    normal: 1.4,
    loose:  1.6,
  },

  // Semantic styles
  styles: {
    price: {
      fontFamily: MONO_FONT,
      fontSize: 22,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    priceSmall: {
      fontFamily: MONO_FONT,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
    },
    label: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
  },
};
