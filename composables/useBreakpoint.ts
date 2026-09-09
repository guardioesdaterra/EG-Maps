/**
 * composables/useBreakpoint.ts
 * @why Canonical EG-Maps responsive breakpoints — wraps VueUse useBreakpoints with project-specific screen sizes
 * @functions useEGBreakpoints
 * @deps @vueuse/core (useBreakpoints)
 */
import { useBreakpoints } from '@vueuse/core'

export function useEGBreakpoints() {
  const bp = useBreakpoints({
    xs: 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  })

  return {
    isMobile: bp.smaller('sm'),
    isTablet: bp.between('sm', 'lg'),
    isDesktop: bp.greaterOrEqual('lg'),
    isXL: bp.greaterOrEqual('xl'),
    is2XL: bp.greaterOrEqual('2xl'),
    breakpoint: bp.active(),
  }
}
