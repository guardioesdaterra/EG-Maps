/**
 * lib/squarespace-codes.ts
 * @why Embed code snippets for the Squarespace integration page.
 *       Separated from the component to avoid Vue SFC macro parser
 *       interpreting HTML tags inside <script setup> string literals.
 */

const L = '<'
const R = '>'

export const embedCodes = {
  iframe: {
    code: [
      '<!-- 1. Add container(s) where you want maps -->',
      '<div data-eg-map="active-crews" style="min-height:480px"></div>',
      '<div data-eg-map="project-grants" style="min-height:480px"></div>',
      '',
      '<!-- 2. Load the widget script (once, anywhere on the page) -->',
      `${L}script src="https://YOUR-DOMAIN/eg-widget.js" defer${L}/script>`,
    ].join('\n'),
    subcodes: [
      {
        label: 'Per-container overrides',
        code: [
          '<div data-eg-map="endangered-species"',
          '     data-mode="iframe"',
          '     data-theme="dark"',
          '     data-accent="#a855f7"',
          '     data-min-height="600"',
          '     data-origin="https://YOUR-DOMAIN"',
          '     style="min-height:600px"></div>',
        ].join('\n'),
      },
      {
        label: 'Legacy launcher (still works)',
        code: [
          '<div id="eg-active-crews" style="min-height:480px"></div>',
          `${L}script src="https://YOUR-DOMAIN/squarespace-embed.js"`,
          '        data-origin="https://YOUR-DOMAIN"',
          '        data-theme="auto"',
          `        defer${L}/script>`,
        ].join('\n'),
      },
    ],
  },

  inline: {
    code: [
      '<div data-eg-map="active-crews"',
      '     data-mode="inline"',
      '     data-theme="auto"',
      '     style="min-height:480px"></div>',
      `${L}script src="https://YOUR-DOMAIN/eg-widget.js" defer${L}/script>`,
    ].join('\n'),
    subcodes: [
      {
        label: 'Inline with custom accent',
        code: [
          '<div data-eg-map="endangered-species"',
          '     data-mode="inline"',
          '     data-accent="#22d3ee"',
          '     style="min-height:500px"></div>',
        ].join('\n'),
      },
    ],
  },

  widget: {
    code: [
      '<!-- Single stat card -->',
      '<div data-eg-widget="stats" data-dataset="active-crews"></div>',
      '',
      '<!-- Mini stats grid (all datasets) -->',
      '<div data-eg-widget="mini-stats" data-datasets="active-crews,project-grants,endangered-species"></div>',
      '',
      `${L}script src="https://YOUR-DOMAIN/eg-widget.js" defer${L}/script>`,
    ].join('\n'),
    subcodes: [
      {
        label: 'Custom origin',
        code: [
          '<div data-eg-widget="stats"',
          '     data-dataset="endangered-species"',
          '     data-origin="https://YOUR-DOMAIN"></div>',
        ].join('\n'),
      },
    ],
  },

  component: {
    code: [
      '<eg-map dataset="active-crews" mode="iframe" height="480"></eg-map>',
      '<eg-map dataset="project-grants" mode="iframe" height="400" theme="dark"></eg-map>',
      '<eg-map dataset="endangered-species" mode="widget" height="300"></eg-map>',
      '',
      `${L}script src="https://YOUR-DOMAIN/eg-widget.js" defer${L}/script>`,
    ].join('\n'),
    subcodes: [
      {
        label: 'Attributes',
        code: [
          '<eg-map dataset="active-crews" mode="iframe" height="480"></eg-map>',
          '',
          '<!-- Attributes:',
          '  dataset  — active-crews | project-grants | endangered-species',
          '  mode     — iframe | inline | widget',
          '  height   — px (default: 480)',
          '  theme    — auto | light | dark',
          '  accent   — CSS color (e.g. #22d3ee)',
          '  origin   — deployment URL',
          '-->',
        ].join('\n'),
      },
    ],
  },

  themeOverride: [
    '<!-- Override via CSS (works with any tier) -->',
    `${L}style>`,
    '  [data-eg-map="active-crews"] {',
    '    --embed-land-stroke: #0f172a;',
    '    --embed-accent: #a855f7;',
    '  }',
    `${L}/style>`,
    '',
    '<!-- Override via data attributes -->',
    '<div data-eg-map="active-crews"',
    '     data-theme="dark"',
    '     data-accent="#a855f7"',
    '     style="min-height:480px"></div>',
  ].join('\n'),

  eventListener: [
    '// Listen for clicks from any embed on the page',
    "document.addEventListener('eg:click', (e) => {",
    "  console.log('Marker clicked:', e.detail);",
    "  // { kind: 'region', id: 'latin-america' }",
    '  // Plausible, GA, etc.',
    '});',
    '',
    '// Listen for errors',
    "document.addEventListener('eg:error', (e) => {",
    "  console.error('Embed error:', e.detail);",
    '});',
  ].join('\n'),
}
