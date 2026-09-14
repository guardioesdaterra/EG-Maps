/**
 * lib/icon-map.ts
 * @why Centralised icon name mapping — old (lucide/mdi) → new (streamline-freehand / gis)
 */

export const ICON_MAP: Record<string, string> = {
  // ── GIS icons (map-related) ──────────────────────────────────
  'lucide:globe':         'gis:globe',
  'lucide:globe-2':       'gis:globe-alt',
  'lucide:map':           'gis:map',
  'lucide:map-pin':       'gis:location',
  'lucide:compass':       'gis:compass',
  'lucide:layers':        'gis:layers',
  'lucide:earth':         'gis:earth',
  'lucide:satellite':     'gis:satellite',
  'lucide:route':         'gis:route',
  'lucide:hexagon':       'gis:hexagon',
  'lucide:network':       'gis:network-o',
  'lucide:circle':        'gis:circle',
  'lucide:flag':          'gis:flag',
  'lucide:square':        'gis:square',

  // ── Streamline-freehand icons (general) ───────────────────────
  // Alerts / warnings
  'lucide:alert-circle':    'streamline-freehand:alerts-warning-triangle',
  'lucide:alert-triangle':  'streamline-freehand:alerts-warning-triangle',
  'lucide:help-circle':     'streamline-freehand:help-question-circle',
  'lucide:x-circle':        'streamline-freehand:remove-delete-sign-bold',

  // Arrows / navigation
  'lucide:arrow-left':      'streamline-freehand:move-rectangle-left',
  'lucide:arrow-right':     'streamline-freehand:share-forward',
  'lucide:arrow-up-down':   'streamline-freehand:flip-reflect-up',
  'lucide:arrow-up-right':  'streamline-freehand:share-forward',
  'lucide:chevron-down':    'streamline-freehand:move-cross-over',
  'lucide:chevron-left':    'streamline-freehand:move-rectangle-left',
  'lucide:chevron-right':   'streamline-freehand:share-forward',
  'lucide:chevron-up':      'streamline-freehand:move-cross-over',
  'lucide:refresh-cw':      'streamline-freehand:synchronize-arrows',
  'lucide:rotate-ccw':      'streamline-freehand:rotate-smartphone',

  // Actions
  'lucide:search':          'streamline-freehand:search-magnifier',
  'lucide:search-x':        'streamline-freehand:search-magnifier',
  'lucide:filter':          'streamline-freehand:paginate-filter-mail',
  'lucide:download':        'streamline-freehand:download-brackets',
  'lucide:file-down':       'streamline-freehand:download-harddrive-1',
  'lucide:upload':          'streamline-freehand:upload-brackets',
  'lucide:plus':            'streamline-freehand:add-sign-bold',
  'lucide:x':               'streamline-freehand:remove-delete-sign-bold',
  'lucide:check':           'streamline-freehand:form-validation-check-square-1',
  'lucide:check-square':    'streamline-freehand:form-validation-check-square-1',
  'lucide:copy':            'streamline-freehand:copy-paste-clipboard',
  'lucide:share-2':         'streamline-freehand:share-circles',
  'lucide:external-link':   'streamline-freehand:share-forward',
  'lucide:ban':             'streamline-freehand:remove-delete-sign-bold',
  'lucide:maximize-2':      'streamline-freehand:fullscreen',
  'lucide:minimize-2':      'streamline-freehand:ui-page-scroll',

  // Content / files
  'lucide:book-open':       'streamline-freehand:book-bookmark',
  'lucide:file-text':       'streamline-freehand:office-file-text',
  'lucide:table':           'streamline-freehand:office-file-sheet',
  'lucide:list':            'streamline-freehand:lists-bullets',
  'lucide:layout-dashboard':'streamline-freehand:layouts-array-1',
  'lucide:layout-list':     'streamline-freehand:layouts-content',

  // Communication
  'lucide:mail':            'streamline-freehand:envelope-letter-front',
  'lucide:message-square':  'streamline-freehand:messages-bubble-square-text',
  'lucide:message-square-plus': 'streamline-freehand:messages-bubble-square-settings',
  'lucide:megaphone':       'streamline-freehand:share-megaphone',
  'lucide:instagram':       'streamline-freehand:share-circles',

  // Users / people
  'lucide:users':           'streamline-freehand:human-resources-businessman',
  'lucide:users-round':     'streamline-freehand:user-multiple',
  'lucide:graduation-cap':  'streamline-freehand:learning-programming-book',

  // Business / finance
  'lucide:briefcase':       'streamline-freehand:job-briefcase-document',
  'lucide:banknote':        'streamline-freehand:money-bill-fly',
  'lucide:dollar-sign':     'streamline-freehand:money-cash-bill',
  'lucide:hand-heart':      'streamline-freehand:donation-charity-donate-heart-flower',
  'lucide:handshake':       'streamline-freehand:business-deal-handshake',
  'lucide:heart-handshake': 'streamline-freehand:business-deal-handshake',

  // Buildings / locations
  'lucide:building':        'streamline-freehand:office-building-glass-window',
  'lucide:building-2':      'streamline-freehand:office-building-outdoors',
  'lucide:home':            'streamline-freehand:home',
  'lucide:landmark':        'streamline-freehand:office-building-glass-window',

  // Data / charts
  'lucide:bar-chart-3':     'streamline-freehand:analytics-graph-bar-horizontal',
  'lucide:chart-line':      'streamline-freehand:analytics-board-graph-line',
  'lucide:trending-up':     'streamline-freehand:stats-line-graph-circle',
  'lucide:database':        'streamline-freehand:database',

  // Time
  'lucide:calendar':        'streamline-freehand:calendar-date',
  'lucide:clock':           'streamline-freehand:time-clock-circle',

  // Settings / config
  'lucide:settings-2':      'streamline-freehand:settings-cog',
  'lucide:sliders-horizontal': 'streamline-freehand:controls-sliders-vertical',

  // Interface
  'lucide:info':            'streamline-freehand:information-desk-question-help',
  'lucide:keyboard':        'streamline-freehand:keyboard',
  'lucide:moon':            'streamline-freehand:light-mode-night-architecture',
  'lucide:sun':             'streamline-freehand:light-mode-brightness-half',
  'lucide:eye-off':         'streamline-freehand:view-eye-off',
  'lucide:languages':       'streamline-freehand:network',

  // Media
  'lucide:play':            'streamline-freehand:multimedia-controls-button-next',
  'lucide:panel-right-close': 'streamline-freehand:layouts-right',
  'lucide:panel-right-open':  'streamline-freehand:layouts-right',

  // Safety / security
  'lucide:shield':          'streamline-freehand:security-computer-shield',
  'lucide:shield-alert':    'streamline-freehand:security-shield-network',
  'lucide:shield-check':    'streamline-freehand:security-shield-settings',
  'lucide:shield-question': 'streamline-freehand:security-computer-shield',

  // Misc
  'lucide:package':         'streamline-freehand:products-shopping-bags',
  'lucide:palette':         'streamline-freehand:color-palette',
  'lucide:weight':          'streamline-freehand:products-purse',
  'lucide:droplets':        'streamline-freehand:water-fountain-sink',
  'lucide:unlink-2':        'streamline-freehand:unlink-broken-chain-1',
  'lucide:mouse-pointer-2': 'streamline-freehand:cursor-highlight-click-1',
  'lucide:notebook-pen':    'streamline-freehand:notes-quill',
  'lucide:radar':           'gis:globe',
  'lucide:sparkles':        'streamline-freehand:creativity-idea-bulb',
  'lucide:zap':             'streamline-freehand:power-button',

  // ── MDI icons → streamline-freehand ──────────────────────────
  'mdi:chart-line':      'streamline-freehand:analytics-board-graph-line',
  'mdi:home':            'streamline-freehand:home',
  'mdi:information':     'streamline-freehand:information-desk-question-help',
  'mdi:weather-night':   'streamline-freehand:light-mode-night-architecture',
  'mdi:weather-sunny':   'streamline-freehand:light-mode-brightness-half',
}

/**
 * Resolve an icon name through the mapping.
 * Returns the mapped name if found, otherwise the original.
 */
export function resolveIcon(name: string): string {
  return ICON_MAP[name] ?? name
}
