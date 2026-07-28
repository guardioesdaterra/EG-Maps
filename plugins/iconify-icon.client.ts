/**
 * plugins/iconify-icon.client.ts
 * @why Iconify icon library registration — registers all used icon sets globally
 * @defaults defineNuxtPlugin
 */
export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined') {
    import('iconify-icon').then(mod => {
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
    })
  }
})
