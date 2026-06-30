<template>
  <div class="gooey-nav relative overflow-visible" ref="containerRef">
    <nav class="flex overflow-visible relative">
      <ul
        ref="navRef"
        class="flex items-center gap-0.5 list-none p-0 m-0 relative z-[3] overflow-visible"
      >
        <li
          v-for="(item, index) in items"
          :key="index"
          :class="['relative cursor-pointer', activeIndex === index ? 'gooey-active' : '']"
        >
          <NuxtLink
            :to="item.path"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
            :aria-current="activeIndex === index ? 'page' : undefined"
            @click="e => handleClick(e, index)"
            class="group relative flex flex-col items-center outline-none px-2.5 py-1.5"
          >
            <div
              class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-lg whitespace-nowrap z-10 bg-gray-900 text-white border border-white/10"
            >
              {{ t(item.labelKey) }}
              <div class="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900" />
            </div>
            <Icon :name="item.icon" class="h-4 w-4 transition-all duration-150" />
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <span class="effect" ref="filterRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, useTemplateRef } from 'vue'
import { useI18n } from '~/composables/useI18n'

interface GooeyNavItem {
  path: string
  labelKey: string
  icon: string
  variant?: 'cyan' | 'green' | 'purple' | 'orange'
  external?: boolean
}

interface GooeyNavProps {
  items: GooeyNavItem[]
  animationTime?: number
  particleCount?: number
  particleDistances?: [number, number]
  particleR?: number
  timeVariance?: number
  colors?: number[]
}

const props = withDefaults(defineProps<GooeyNavProps>(), {
  animationTime: 600,
  particleCount: 15,
  particleDistances: () => [90, 10] as [number, number],
  particleR: 100,
  timeVariance: 300,
  colors: () => [1, 2, 3, 1, 2, 3, 1, 4],
})

const route = useRoute()
const { t } = useI18n()

const containerRef = useTemplateRef<HTMLDivElement>('containerRef')
const navRef = useTemplateRef<HTMLUListElement>('navRef')
const filterRef = useTemplateRef<HTMLSpanElement>('filterRef')

const activeIndex = ref(0)

let resizeObserver: ResizeObserver | null = null

function computeActiveIndex(): number {
  for (let i = 0; i < props.items.length; i++) {
    const item = props.items[i]
    if (item.external) continue
    const p = item.path
    if (p === '/' && route.path === '/') return i
    if (p === '/info' && route.path === '/info') return i
    if (p !== '/' && p !== '/info' && route.path.startsWith(p)) return i
  }
  return 0
}

watch(() => route.path, () => {
  const idx = computeActiveIndex()
  if (idx !== activeIndex.value) {
    activeIndex.value = idx
  }
})

const noise = (n = 1): number => n / 2 - Math.random() * n

const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
  return [distance * Math.cos(angle), distance * Math.sin(angle)]
}

const createParticle = (i: number, t: number, d: [number, number], r: number) => {
  const rotate = noise(r / 10)
  return {
    start: getXY(d[0], props.particleCount - i, props.particleCount),
    end: getXY(d[1] + noise(7), props.particleCount - i, props.particleCount),
    time: t,
    scale: 1 + noise(0.2),
    color: props.colors[Math.floor(Math.random() * props.colors.length)],
    rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
  }
}

const makeParticles = (element: HTMLElement) => {
  const d: [number, number] = props.particleDistances
  const r = props.particleR
  const bubbleTime = props.animationTime * 2 + props.timeVariance
  element.style.setProperty('--time', `${bubbleTime}ms`)
  for (let i = 0; i < props.particleCount; i++) {
    const t = props.animationTime * 2 + noise(props.timeVariance * 2)
    const p = createParticle(i, t, d, r)
    element.classList.remove('active')
    setTimeout(() => {
      const particle = document.createElement('span')
      const point = document.createElement('span')
      particle.classList.add('particle')
      particle.style.setProperty('--start-x', `${p.start[0]}px`)
      particle.style.setProperty('--start-y', `${p.start[1]}px`)
      particle.style.setProperty('--end-x', `${p.end[0]}px`)
      particle.style.setProperty('--end-y', `${p.end[1]}px`)
      particle.style.setProperty('--time', `${p.time}ms`)
      particle.style.setProperty('--scale', `${p.scale}`)
      particle.style.setProperty('--color', `var(--color-${p.color}, white)`)
      particle.style.setProperty('--rotate', `${p.rotate}deg`)
      point.classList.add('point')
      particle.appendChild(point)
      element.appendChild(particle)
      requestAnimationFrame(() => {
        element.classList.add('active')
      })
      setTimeout(() => {
        try {
          element.removeChild(particle)
        } catch {
          // already removed
        }
      }, t)
    }, 30)
  }
}

const handleClick = (e: Event, index: number) => {
  const item = props.items[index]
  if (item?.external) return

  const target = e.currentTarget as HTMLElement
  const liEl = target.parentElement as HTMLElement
  if (activeIndex.value === index) return
  activeIndex.value = index

  if (filterRef.value) {
    const containerRect = containerRef.value!.getBoundingClientRect()
    const pos = liEl.getBoundingClientRect()
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    }
    Object.assign(filterRef.value.style, styles)

    const particles = filterRef.value.querySelectorAll('.particle')
    particles.forEach(p => filterRef.value!.removeChild(p))
    makeParticles(filterRef.value)
  }
}

onMounted(() => {
  activeIndex.value = computeActiveIndex()

  resizeObserver = new ResizeObserver(() => {
    // nothing to update — effect only shows during click animation
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style>
.gooey-nav .effect {
  position: absolute;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
}

.gooey-nav .effect.active {
  opacity: 1;
}

.gooey-nav .particle,
.gooey-nav .point {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  transform-origin: center;
}

.gooey-nav .particle {
  --time: 5s;
  position: absolute;
  top: calc(50% - 8px);
  left: calc(50% - 8px);
  animation: gooey-particle calc(var(--time)) ease 1 -350ms;
}

.gooey-nav .point {
  background: var(--color);
  opacity: 0;
  animation: gooey-point calc(var(--time)) ease 1 -350ms;
}

@keyframes gooey-particle {
  0% {
    transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
    opacity: 1;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  70% {
    transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
    opacity: 1;
    animation-timing-function: ease;
  }
  85% {
    transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
    opacity: 1;
  }
  100% {
    transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
    opacity: 1;
  }
}

@keyframes gooey-point {
  0% {
    transform: scale(0);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
  }
  25% {
    transform: scale(calc(var(--scale) * 0.25));
  }
  38% {
    opacity: 1;
  }
  65% {
    transform: scale(var(--scale));
    opacity: 1;
    animation-timing-function: ease;
  }
  85% {
    transform: scale(var(--scale));
    opacity: 1;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}

/* macOS-style active dot indicator */
.gooey-nav li.gooey-active::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 3px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.8);
}
</style>
