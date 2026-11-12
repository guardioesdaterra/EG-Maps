/**
 * components/tools/garden/design-tokens.ts
 * @why Flat, theme-aware design system for the Garden Tool.
 *      No glassmorphism, no transparency hacks — solid colors that work in both themes.
 * @exports tokens, cssVars
 */
export const gardenTokens = {
  // ── Spacing ──────────────────────────────────────────────────────────────
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },

  // ── Border Radius ────────────────────────────────────────────────────────
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px',
    full: '999px',
  },

  // ── Touch Targets ────────────────────────────────────────────────────────
  touchTarget: {
    sm: '40px',
    md: '48px',
    lg: '56px',
  },

  // ── Transitions ──────────────────────────────────────────────────────────
  transition: {
    fast: '120ms ease-out',
    base: '180ms ease-out',
    slow: '250ms ease-out',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // ── Z-Index ──────────────────────────────────────────────────────────────
  zIndex: {
    base: 10,
    toolbar: 100,
    sheet: 200,
    modal: 300,
    toast: 400,
  },

  // ── Breakpoints ──────────────────────────────────────────────────────────
  breakpoint: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
  },
} as const;

// ── CSS Variable Generator ─────────────────────────────────────────────────
export function generateGardenCSSVars(theme: 'light' | 'dark'): Record<string, string> {
  const isDark = theme === 'dark';

  // ── Core Palette ─────────────────────────────────────────────────────────
  const palette = {
    // Brand
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    // Success
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    // Warning
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    // Danger
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    // Neutral (theme-aware)
    neutral: isDark
      ? {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      : {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
  };

  // ── Semantic Colors ──────────────────────────────────────────────────────
  const semantic = {
    // Backgrounds
    bg: {
      primary: isDark ? palette.neutral[950] : palette.neutral[50],
      secondary: isDark ? palette.neutral[900] : palette.neutral[100],
      tertiary: isDark ? palette.neutral[800] : palette.neutral[200],
      inverse: isDark ? palette.neutral[100] : palette.neutral[900],
    },
    // Surfaces (cards, sheets, modals)
    surface: {
      primary: isDark ? palette.neutral[900] : palette.neutral[50],
      secondary: isDark ? palette.neutral[800] : palette.neutral[100],
      tertiary: isDark ? palette.neutral[700] : palette.neutral[200],
      hover: isDark ? palette.neutral[800] : palette.neutral[100],
      active: isDark ? palette.neutral[700] : palette.neutral[200],
    },
    // Borders
    border: {
      primary: isDark ? palette.neutral[700] : palette.neutral[300],
      secondary: isDark ? palette.neutral[600] : palette.neutral[200],
      focus: palette.brand[500],
      error: palette.danger[500],
    },
    // Text
    text: {
      primary: isDark ? palette.neutral[50] : palette.neutral[950],
      secondary: isDark ? palette.neutral[400] : palette.neutral[600],
      muted: isDark ? palette.neutral[500] : palette.neutral[500],
      inverse: isDark ? palette.neutral[950] : palette.neutral[50],
      link: palette.brand[400],
    },
    // Brand
    brand: {
      primary: palette.brand[500],
      hover: palette.brand[600],
      light: isDark ? palette.brand[900] : palette.brand[50],
      dark: palette.brand[700],
    },
    // Success
    success: {
      primary: palette.success[500],
      hover: palette.success[600],
      light: isDark ? palette.success[900] : palette.success[50],
    },
    // Warning
    warning: {
      primary: palette.warning[500],
      hover: palette.warning[600],
      light: isDark ? palette.warning[900] : palette.warning[50],
    },
    // Danger
    danger: {
      primary: palette.danger[500],
      hover: palette.danger[600],
      light: isDark ? palette.danger[900] : palette.danger[50],
    },
  };

  // ── Convert to CSS Variables ─────────────────────────────────────────────
  const cssVars: Record<string, string> = {};

  // Spacing
  Object.entries(gardenTokens.space).forEach(([key, value]) => {
    cssVars[`--garden-space-${key}`] = value;
  });

  // Radius
  Object.entries(gardenTokens.radius).forEach(([key, value]) => {
    cssVars[`--garden-radius-${key}`] = value;
  });

  // Touch targets
  Object.entries(gardenTokens.touchTarget).forEach(([key, value]) => {
    cssVars[`--garden-touch-${key}`] = value;
  });

  // Transitions
  Object.entries(gardenTokens.transition).forEach(([key, value]) => {
    cssVars[`--garden-transition-${key}`] = value;
  });

  // Z-index
  Object.entries(gardenTokens.zIndex).forEach(([key, value]) => {
    cssVars[`--garden-z-${key}`] = String(value);
  });

  // Semantic colors
  const flatten = (obj: Record<string, unknown>, prefix: string) => {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        flatten(value as Record<string, unknown>, `${prefix}-${key}`);
      } else {
        cssVars[`--garden-${prefix}-${key}`] = value as string;
      }
    });
  };

  flatten(semantic, 'color');

  return cssVars;
}

// ── Theme-Aware CSS Variable Injection ─────────────────────────────────────
export function injectGardenTheme(theme: 'light' | 'dark'): void {
  const vars = generateGardenCSSVars(theme);
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// ── Auto Theme Detection ───────────────────────────────────────────────────
export function setupGardenThemeListener(): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    injectGardenTheme(e.matches ? 'dark' : 'light');
  };
  mediaQuery.addEventListener('change', handler);
  injectGardenTheme(mediaQuery.matches ? 'dark' : 'light');
  return () => mediaQuery.removeEventListener('change', handler);
}