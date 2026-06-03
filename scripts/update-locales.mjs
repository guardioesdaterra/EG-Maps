#!/usr/bin/env node
/**
 * One-shot script to merge new i18n keys into the existing locale files.
 * Preserves existing keys, adds new ones, and keeps proper JSON formatting.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCALES_DIR = resolve(process.cwd(), 'locales')
const FILES = ['en', 'es', 'fr', 'pt', 'ar', 'hi', 'ja', 'zh']

// Per-locale overrides for non-English locales
const OVERRIDES = {
  es: {
    palette: {
      title: 'Paleta de comandos',
      placeholder: 'Escribe un comando, buscar…',
      searchInput: 'Buscar comandos',
      navigate: 'navegar',
      select: 'seleccionar',
      close: 'cerrar',
      noResults: 'Sin comandos coincidentes',
    },
    observatory: {
      sidebarLabel: 'Barra lateral del Observatorio',
      sidebarCollapse: 'Colapsar barra',
      sidebarExpand: 'Expandir barra',
      selectTab: 'Selecciona una pestaña',
      categories: {
        direct_ree: 'REE directas',
        carbonatite_associated: 'Carbonatita/Alcalino',
        pegmatite_associated: 'Pegmatita',
        heavy_mineral_associated: 'Mineral pesado',
        phosphate_associated: 'Fosfato',
        strategic_associated: 'Estratégicos',
      },
      dangerPanel: {
        empty: 'Sin datos cargados',
        flyTo: 'Ir a {name}',
        pager: 'Paginación',
        prevPage: 'Página anterior',
        nextPage: 'Página siguiente',
      },
      envPanel: { flyTo: 'Ir a {name}' },
      popups: {
        dangerLabel: '{score} peligro',
        networkBadgeTitle: 'Clúster de red corporativa',
        substances: 'Sustancias',
        year: 'Año',
        unknown: 'Desconocido',
        lastEventRecent: 'Reciente',
        lastEventActive: 'Activo',
        lastEventStale: 'Antiguo',
        overlaps: 'Superposiciones',
      },
      actions: { openInSidebar: 'Abrir en barra lateral' },
    },
  },
  fr: {
    palette: {
      title: 'Palette de commandes',
      placeholder: 'Tapez une commande, rechercher…',
      searchInput: 'Rechercher des commandes',
      navigate: 'naviguer',
      select: 'sélectionner',
      close: 'fermer',
      noResults: 'Aucune commande correspondante',
    },
    observatory: {
      sidebarLabel: 'Barre latérale de l\'Observatoire',
      sidebarCollapse: 'Réduire la barre',
      sidebarExpand: 'Développer la barre',
      selectTab: 'Sélectionnez un onglet',
      categories: {
        direct_ree: 'REE directes',
        carbonatite_associated: 'Carbonatite/Alcalin',
        pegmatite_associated: 'Pegmatite',
        heavy_mineral_associated: 'Minéral lourd',
        phosphate_associated: 'Phosphate',
        strategic_associated: 'Stratégiques',
      },
      dangerPanel: {
        empty: 'Aucune donnée chargée',
        flyTo: 'Aller à {name}',
        pager: 'Pagination',
        prevPage: 'Page précédente',
        nextPage: 'Page suivante',
      },
      envPanel: { flyTo: 'Aller à {name}' },
      popups: {
        dangerLabel: '{score} danger',
        networkBadgeTitle: 'Grappe de réseau d\'entreprises',
        substances: 'Substances',
        year: 'Année',
        unknown: 'Inconnu',
        lastEventRecent: 'Récent',
        lastEventActive: 'Actif',
        lastEventStale: 'Ancien',
        overlaps: 'Chevauchements',
      },
      actions: { openInSidebar: 'Ouvrir dans la barre latérale' },
    },
  },
  pt: {
    palette: {
      title: 'Paleta de comandos',
      placeholder: 'Digite um comando, buscar…',
      searchInput: 'Buscar comandos',
      navigate: 'navegar',
      select: 'selecionar',
      close: 'fechar',
      noResults: 'Nenhum comando correspondente',
    },
    observatory: {
      sidebarLabel: 'Barra lateral do Observatório',
      sidebarCollapse: 'Recolher barra',
      sidebarExpand: 'Expandir barra',
      selectTab: 'Selecione uma aba',
      categories: {
        direct_ree: 'REE diretas',
        carbonatite_associated: 'Carbonatito/Alcalino',
        pegmatite_associated: 'Pegmatito',
        heavy_mineral_associated: 'Mineral pesado',
        phosphate_associated: 'Fosfato',
        strategic_associated: 'Estratégicos',
      },
      dangerPanel: {
        empty: 'Nenhum dado carregado',
        flyTo: 'Ir para {name}',
        pager: 'Paginação',
        prevPage: 'Página anterior',
        nextPage: 'Próxima página',
      },
      envPanel: { flyTo: 'Ir para {name}' },
      popups: {
        dangerLabel: '{score} perigo',
        networkBadgeTitle: 'Cluster de rede corporativa',
        substances: 'Substâncias',
        year: 'Ano',
        unknown: 'Desconhecido',
        lastEventRecent: 'Recente',
        lastEventActive: 'Ativo',
        lastEventStale: 'Antigo',
        overlaps: 'Sobreposições',
      },
      actions: { openInSidebar: 'Abrir na barra lateral' },
    },
  },
  ar: {
    palette: {
      title: 'لوحة الأوامر',
      placeholder: 'اكتب أمراً، ابحث…',
      searchInput: 'البحث عن الأوامر',
      navigate: 'تنقل',
      select: 'اختر',
      close: 'إغلاق',
      noResults: 'لا توجد أوامر مطابقة',
    },
    observatory: {
      sidebarLabel: 'الشريط الجانبي للمرصد',
      sidebarCollapse: 'طي الشريط',
      sidebarExpand: 'توسيع الشريط',
      selectTab: 'اختر تبويباً',
      categories: {
        direct_ree: 'REE مباشرة',
        carbonatite_associated: 'كربوناتيت/قلوي',
        pegmatite_associated: 'بيغماتيت',
        heavy_mineral_associated: 'معدن ثقيل',
        phosphate_associated: 'فوسفات',
        strategic_associated: 'استراتيجي',
      },
      dangerPanel: {
        empty: 'لا توجد بيانات محملة',
        flyTo: 'الانتقال إلى {name}',
        pager: 'ترقيم الصفحات',
        prevPage: 'الصفحة السابقة',
        nextPage: 'الصفحة التالية',
      },
      envPanel: { flyTo: 'الانتقال إلى {name}' },
      popups: {
        dangerLabel: '{score} خطر',
        networkBadgeTitle: 'تجمع شبكة الشركات',
        substances: 'المواد',
        year: 'السنة',
        unknown: 'غير معروف',
        lastEventRecent: 'حديث',
        lastEventActive: 'نشط',
        lastEventStale: 'قديم',
        overlaps: 'تداخلات',
      },
      actions: { openInSidebar: 'فتح في الشريط الجانبي' },
    },
  },
  hi: {
    palette: {
      title: 'कमांड पैलेट',
      placeholder: 'कमांड टाइप करें, खोजें…',
      searchInput: 'कमांड खोजें',
      navigate: 'नेविगेट',
      select: 'चुनें',
      close: 'बंद करें',
      noResults: 'कोई मेल खाने वाला कमांड नहीं',
    },
    observatory: {
      sidebarLabel: 'ऑब्ज़र्वेटरी साइडबार',
      sidebarCollapse: 'साइडबार बंद करें',
      sidebarExpand: 'साइडबार खोलें',
      selectTab: 'टैब चुनें',
      categories: {
        direct_ree: 'प्रत्यक्ष REE',
        carbonatite_associated: 'कार्बोनेटाइट/क्षारीय',
        pegmatite_associated: 'पेग्माटाइट',
        heavy_mineral_associated: 'भारी खनिज',
        phosphate_associated: 'फॉस्फेट',
        strategic_associated: 'रणनीतिक',
      },
      dangerPanel: {
        empty: 'कोई डेटा लोड नहीं',
        flyTo: '{name} पर जाएं',
        pager: 'पेजर',
        prevPage: 'पिछला पृष्ठ',
        nextPage: 'अगला पृष्ठ',
      },
      envPanel: { flyTo: '{name} पर जाएं' },
      popups: {
        dangerLabel: '{score} खतरा',
        networkBadgeTitle: 'कॉर्पोरेट नेटवर्क क्लस्टर',
        substances: 'पदार्थ',
        year: 'वर्ष',
        unknown: 'अज्ञात',
        lastEventRecent: 'हालिया',
        lastEventActive: 'सक्रिय',
        lastEventStale: 'पुराना',
        overlaps: 'ओवरलैप',
      },
      actions: { openInSidebar: 'साइडबार में खोलें' },
    },
  },
  ja: {
    palette: {
      title: 'コマンドパレット',
      placeholder: 'コマンドを入力、検索…',
      searchInput: 'コマンドを検索',
      navigate: 'ナビゲート',
      select: '選択',
      close: '閉じる',
      noResults: '一致するコマンドがありません',
    },
    observatory: {
      sidebarLabel: '観測所サイドバー',
      sidebarCollapse: 'サイドバーを折りたたむ',
      sidebarExpand: 'サイドバーを展開',
      selectTab: 'タブを選択',
      categories: {
        direct_ree: '直接REE',
        carbonatite_associated: 'カーボナタイト/アルカリ',
        pegmatite_associated: 'ペグマタイト',
        heavy_mineral_associated: '重鉱物',
        phosphate_associated: 'リン酸塩',
        strategic_associated: '戦略的',
      },
      dangerPanel: {
        empty: 'データなし',
        flyTo: '{name}へ移動',
        pager: 'ページネーション',
        prevPage: '前のページ',
        nextPage: '次のページ',
      },
      envPanel: { flyTo: '{name}へ移動' },
      popups: {
        dangerLabel: '危険度 {score}',
        networkBadgeTitle: '企業ネットワーククラスター',
        substances: '物質',
        year: '年',
        unknown: '不明',
        lastEventRecent: '最近',
        lastEventActive: 'アクティブ',
        lastEventStale: '古い',
        overlaps: '重複',
      },
      actions: { openInSidebar: 'サイドバーで開く' },
    },
  },
  zh: {
    palette: {
      title: '命令面板',
      placeholder: '输入命令，搜索…',
      searchInput: '搜索命令',
      navigate: '导航',
      select: '选择',
      close: '关闭',
      noResults: '无匹配命令',
    },
    observatory: {
      sidebarLabel: '观测台侧边栏',
      sidebarCollapse: '折叠侧边栏',
      sidebarExpand: '展开侧边栏',
      selectTab: '选择标签',
      categories: {
        direct_ree: '直接REE',
        carbonatite_associated: '碳酸岩/碱性',
        pegmatite_associated: '伟晶岩',
        heavy_mineral_associated: '重砂矿物',
        phosphate_associated: '磷酸盐',
        strategic_associated: '战略性',
      },
      dangerPanel: {
        empty: '暂无数据',
        flyTo: '飞到 {name}',
        pager: '分页',
        prevPage: '上一页',
        nextPage: '下一页',
      },
      envPanel: { flyTo: '飞到 {name}' },
      popups: {
        dangerLabel: '{score} 危险',
        networkBadgeTitle: '企业网络集群',
        substances: '物质',
        year: '年份',
        unknown: '未知',
        lastEventRecent: '最近',
        lastEventActive: '活跃',
        lastEventStale: '陈旧',
        overlaps: '重叠',
      },
      actions: { openInSidebar: '在侧边栏中打开' },
    },
  },
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    const sv = source[key]
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      target[key] = deepMerge(target[key] && typeof target[key] === 'object' ? target[key] : {}, sv)
    } else {
      target[key] = sv
    }
  }
  return target
}

let updated = 0
for (const code of FILES) {
  const path = resolve(LOCALES_DIR, `${code}.json`)
  const data = JSON.parse(readFileSync(path, 'utf8'))

  // Use override if available, else English fallback
  const additions = OVERRIDES[code] || {
    palette: {
      title: 'Command palette',
      placeholder: 'Type a command, search…',
      searchInput: 'Search commands',
      navigate: 'navigate',
      select: 'select',
      close: 'close',
      noResults: 'No matching commands',
    },
    observatory: {
      sidebarLabel: 'Observatory sidebar',
      sidebarCollapse: 'Collapse sidebar',
      sidebarExpand: 'Expand sidebar',
      selectTab: 'Select a tab',
      categories: {
        direct_ree: 'Direct REE',
        carbonatite_associated: 'Carbonatite/Alkaline',
        pegmatite_associated: 'Pegmatite',
        heavy_mineral_associated: 'Heavy Mineral',
        phosphate_associated: 'Phosphate',
        strategic_associated: 'Strategic',
      },
      dangerPanel: {
        empty: 'No data loaded',
        flyTo: 'Fly to {name}',
        pager: 'Pagination',
        prevPage: 'Previous page',
        nextPage: 'Next page',
      },
      envPanel: { flyTo: 'Fly to {name}' },
      popups: {
        dangerLabel: '{score} danger',
        networkBadgeTitle: 'Corporate network cluster',
        substances: 'Substances',
        year: 'Year',
        unknown: 'Unknown',
        lastEventRecent: 'Recent',
        lastEventActive: 'Active',
        lastEventStale: 'Stale',
        overlaps: 'Overlaps',
      },
      actions: { openInSidebar: 'Open in sidebar' },
    },
  }

  const merged = deepMerge(data, additions)
  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n', 'utf8')
  updated++
  console.log(`✓ Updated ${code}.json`)
}

console.log(`\n${updated} locale files updated.`)
