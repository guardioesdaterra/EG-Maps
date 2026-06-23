import en from '../locales/en.json'
import es from '../locales/es.json'
import fr from '../locales/fr.json'
import pt from '../locales/pt.json'
import ar from '../locales/ar.json'
import hi from '../locales/hi.json'
import ja from '../locales/ja.json'
import zh from '../locales/zh.json'
import nl from '../locales/nl.json'
import de from '../locales/de.json'

/**
 * vue-i18n configuration for @nuxtjs/i18n.
 *
 * We bundle the 10 locales statically (synchronously) because the project's
 * previous useI18n already imports `en` synchronously, and these JSON files
 * are small (~10-30 KB each). This keeps SSR simple and avoids async
 * hydration races. The benefit over the previous custom composable is that
 * vue-i18n provides proper pluralization, number/date formatting, and
 * devtools support.
 */
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  silentFallbackWarn: true,
  messages: {
    en,
    es,
    fr,
    pt,
    ar,
    hi,
    ja,
    zh,
    nl,
    de,
  },
}))
