<template>
  <section class="border-t border-black bg-white px-[clamp(0.875rem,4vw,2.5rem)] py-[clamp(3rem,8vh,6rem)]">
    <div class="mx-auto w-[min(100%,78rem)]">
      <header class="mb-[clamp(1.5rem,4vw,3rem)]">
        <h2 class="text-[clamp(1.25rem,4vw,2.5rem)] font-black leading-tight tracking-normal">
          {{ t('home.databasesTitle') }}
        </h2>
        <p class="mt-2 xs:mt-3 max-w-[min(100%,40rem)] text-xs xs:text-sm leading-6 text-black/65">
          {{ t('home.databasesDesc') }}
        </p>
      </header>

      <div class="grid gap-[clamp(0.875rem,2vw,1.5rem)] md:grid-cols-2">
        <article
          v-for="db in databases"
          :key="db.id"
          class="flex flex-col rounded-lg border-2 border-black bg-white p-[clamp(1rem,3vw,1.75rem)] transition-transform duration-200 hover:-translate-y-1"
        >
          <div class="mb-3 xs:mb-4 flex items-center gap-3 xs:gap-4">
            <div class="flex h-[clamp(2.25rem,7vw,3rem)] w-[clamp(2.25rem,7vw,3rem)] shrink-0 items-center justify-center rounded-full border-2 border-black bg-black text-white">
              <Icon :name="db.icon" class="h-4 w-4 xs:h-5 xs:w-5" />
            </div>
            <span class="truncate rounded-full border border-black px-2 xs:px-3 py-0.5 xs:py-1 text-[10px] xs:text-[11px] font-black uppercase tracking-[0.16em] xs:tracking-[0.18em]">
              {{ db.scope }}
            </span>
          </div>

          <h3 class="text-[clamp(1rem,2.5vw,1.35rem)] font-black leading-tight tracking-normal">{{ db.title }}</h3>
          <p class="mt-2 xs:mt-3 flex-1 text-xs xs:text-sm leading-6 text-black/65">{{ db.description }}</p>

          <div class="mt-4 xs:mt-6 flex flex-wrap items-center gap-2 xs:gap-3">
            <a
              :href="`mailto:crews@earthguardians.org?subject=${encodeURIComponent(t('home.submitDataSubject'))}%20-%20${encodeURIComponent(db.title)}`"
              class="inline-flex items-center gap-1.5 xs:gap-2 rounded-md border-2 border-black bg-black px-3 xs:px-4 xs:px-5 py-2 xs:py-2.5 text-xs xs:text-sm font-black text-white transition-colors hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-black/20"
            >
              <Icon name="lucide:mail" class="h-3.5 w-3.5 xs:h-4 xs:w-4" />
              {{ t('home.submitData') }}
            </a>
            <a
              :href="db.link"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 xs:gap-2 rounded-md border-2 border-black px-3 xs:px-4 xs:px-5 py-2 xs:py-2.5 text-xs xs:text-sm font-black text-black transition-colors hover:bg-black hover:text-white focus:outline-none focus:ring-4 focus:ring-black/20"
            >
              <Icon name="lucide:external-link" class="h-3.5 w-3.5 xs:h-4 xs:w-4" />
              {{ t('home.view2d') }}
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Database {
  id: string
  icon: string
  scope: string
  title: string
  description: string
  link: string
}

const { t } = useI18n()

const databases: Database[] = [
  {
    id: 'iucn',
    icon: 'lucide:globe',
    scope: t('home.iucnScope'),
    title: t('home.iucnTitle'),
    description: t('home.iucnDesc'),
    link: 'https://www.iucnredlist.org/',
  },
  {
    id: 'icmbio',
    icon: 'lucide:tree-pine',
    scope: t('home.icmbioScope'),
    title: t('home.icmbioTitle'),
    description: t('home.icmbioDesc'),
    link: 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade',
  },
]
</script>
