/**
 * server/plugins/websocket-polyfill.ts
 * @why Nitro server plugin — Supabase's realtime-js requires a WebSocket
 *      constructor at client-construction time and throws on Node < 22
 *      (no native WebSocket), which 500s every SSR/prerendered route that
 *      touches useSupabase (/eg-grants, /eg-grants/fullscreen,
 *      /auth/callback). Polyfilling globalThis.WebSocket with `ws` keeps
 *      server rendering working on all supported Node versions. Client
 *      bundles are unaffected (this plugin only runs in Nitro).
 */
import WebSocket from 'ws'

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as unknown as typeof WebSocket
}

export default defineNitroPlugin(() => {
  // Polyfill applied on import — nothing to do per request.
})
