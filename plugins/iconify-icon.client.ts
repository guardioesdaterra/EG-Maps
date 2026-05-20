export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined') {
    import('iconify-icon').then(mod => {
      // Preload the entire svg-spinners collection so fallback/error animations
      // render immediately without any CDN round-trip.
      mod.addCollection({
        name: 'svg-spinners',
        total: 46,
        author: {
          name: 'Utkarsh Verma',
          url: 'https://github.com/n3r4zzurr0/svg-spinners',
        },
        license: {
          title: 'MIT',
          spdx: 'MIT',
          url: 'https://github.com/n3r4zzurr0/svg-spinners/blob/main/LICENSE',
        },
        height: 24,
        category: 'UI 24px',
        icons: {},
      } as never)
      // iconify-icon will automatically fetch missing icon data from the API
      // (svgs rendered are inline - no external font/CSS needed)
    })
  }
})
