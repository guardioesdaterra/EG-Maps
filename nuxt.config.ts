// https://nuxt.com/docs/api/configuration/nuxt-config
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@vueuse/motion/nuxt',
    '@vueuse/nuxt',
  ],

  plugins: ['~/plugins/iconify-icon.client.ts', '~/plugins/command-palette.client.ts'],

  // vueuse-motion configuration
  motion: {
    directives: ['fade', 'slide', 'pop', 'bounce', 'flip', 'morph'],
  },

  // vueuse module
  vueuse: {
    ssrHandlers: true,
  },

  // i18n — keep URLs unchanged via no_prefix; the existing useI18n composable
  // delegates to vue-i18n's $t so we get lazy-loaded locale bundles and
  // proper pluralization/formatting for free.
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    vueI18n: './i18n.config.ts',
    langDir: '../locales',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'es', language: 'es-ES', name: 'Español', file: 'es.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'pt', language: 'pt-BR', name: 'Português', file: 'pt.json' },
      { code: 'ar', language: 'ar-SA', name: 'العربية', file: 'ar.json' },
      { code: 'hi', language: 'hi-IN', name: 'हिन्दी', file: 'hi.json' },
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
      { code: 'zh', language: 'zh-CN', name: '中文', file: 'zh.json' },
    ],
    detectBrowserLanguage: false,
  },

  // SSG with prerendered HTML for all routes - enables proper GitHub Pages indexing and refresh
  ssr: true,
  routeRules: {
    '/**': { prerender: true },
    '/observatory-of-vulcan/3d': { redirect: `${baseURL}observatory-of-vulcan?mode=3d` },
    '/globe': { redirect: `${baseURL}project-grants/3d` },
  },

  // App configuration
  app: {
    baseURL,
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
      // Inline script to prevent flash of wrong theme - runs before page renders
      script: [
        {
          innerHTML: `(function() {
            try {
              var saved = localStorage.getItem('darkMode');
              if (saved === 'true' || saved === null) {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          })();`,
          type: 'text/javascript',
          tagPosition: 'head',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: `${baseURL}eg-logo.png` },
        { rel: 'manifest', href: `${baseURL}manifest.json` },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
      ],
    },
  },

  // Runtime config for API keys + analytics
  runtimeConfig: {
    public: {
      maptilerApiKey: process.env.NUXT_PUBLIC_MAPTILER_API_KEY || process.env.MAPTILER_API_KEY || '',
      // Set NUXT_PUBLIC_PLAUSIBLE_DOMAIN to enable Plausible analytics.
      // Example: 'eg-maps.example.org'
      plausibleDomain: process.env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
    },
  },

  // CSS - only MapLibre
  css: ['~/assets/css/main.css', 'maplibre-gl/dist/maplibre-gl.css'],

  // Build settings
  typescript: {
    strict: true,
    typeCheck: true,
    shim: false,
  },

  // Nitro (static output)
  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      routes: ['/', '/globe', '/info', '/project-grants', '/project-grants/3d', '/endangered-species', '/endangered-species/3d', '/observatory-of-vulcan', '/observatory-of-vulcan/3d'],
      ignore: ['/EG-Maps/manifest.json'],
    },
    compressPublicAssets: true,
  },

  experimental: {
    appManifest: false,
  },

  // Vite config for MapLibre + WSL HMR
  vite: {
    optimizeDeps: {
      include: ['maplibre-gl'],
    },
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
      },
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**', '**/*[*]*/**'],
      },
    },
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'iconify-icon',
    },
  },
});
