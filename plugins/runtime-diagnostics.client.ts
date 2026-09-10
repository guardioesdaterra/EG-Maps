export default defineNuxtPlugin(() => {
  const prefix = '[EG Maps] runtime'
  window.addEventListener('error', (event) => {
    console.error(prefix, 'window error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error,
    })
  })
  window.addEventListener('unhandledrejection', (event) => {
    console.error(prefix, 'unhandled rejection', event.reason)
  })
  console.info(prefix, 'diagnostics enabled', {
    href: window.location.href,
    basePath: document.baseURI,
    webgl: Boolean(document.createElement('canvas').getContext('webgl')),
  })
})
