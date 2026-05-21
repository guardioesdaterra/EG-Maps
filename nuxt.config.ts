// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  plugins: ['~/plugins/iconify-icon.client.ts'],

  // SSG configuration - static site generation
  ssr: true,
  routeRules: {
    '/': { prerender: true },
    '/info': { prerender: true },
    '/project-grants': { prerender: true },
    '/project-grants/3d': { prerender: true },
    '/endangered-species': { prerender: true },
    '/endangered-species/3d': { prerender: true },
    '/globe': { prerender: true },
  },

  // App configuration
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'Earth Guardians - Interactive Data Visualization',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
        { name: 'description', content: 'Interactive maps for endangered species and project grants data visualization' },
        { name: 'theme-color', content: '#0a0a0a' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Earth Guardians' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/eg-logo.png' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
    },
  },

  // Runtime config for API keys
  runtimeConfig: {
    public: {
      maptilerApiKey: process.env.NUXT_PUBLIC_MAPTILER_API_KEY || '',
    },
  },

  // CSS - only MapLibre
  css: ['~/assets/css/main.css', 'maplibre-gl/dist/maplibre-gl.css'],

  // Build settings
  typescript: {
    strict: true,
    typeCheck: false,
  },

  // Nitro (static output)
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/info', '/project-grants', '/project-grants/3d', '/endangered-species', '/endangered-species/3d'],
    },
    compressPublicAssets: true,
  },

  // Vite config for MapLibre
  vite: {
    optimizeDeps: {
      include: ['maplibre-gl'],
    },
  },
});
