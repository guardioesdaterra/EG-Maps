<template>
  <div class="gooey-nav relative overflow-visible" ref="containerRef">
    <nav class="flex overflow-visible relative" :style="{ transform: 'translate3d(0,0,0.01px)' }">
      <ul
        ref="navRef"
        class="flex items-end gap-1 list-none p-0 m-0 relative z-[3] overflow-visible"
      >
        <li
          v-for="(item, index) in items"
          :key="index"
          :class="[
            'rounded-full relative cursor-pointer overflow-visible transition-[background-color_color] duration-300',
            activeIndex === index ? 'gooey-active' : ''
          ]"
        >
          <NuxtLink
            :to="item.path"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
            @click="e => handleClick(e, index)"
            class="group relative flex flex-col items-center outline-none py-[0.6em] px-[1em]"
          >
            <div
              class="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none shadow-lg whitespace-nowrap z-10 bg-black text-white dark:bg-gray-900/95 dark:backdrop-blur dark:border dark:border-white/10"
            >
              {{ t(item.labelKey) }}
              <div class="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-black dark:border-t-gray-900/95" />
            </div>
            <Icon :name="item.icon" class="h-5 w-5 transition-all duration-150" />
            <span class="text-[10px] mt-0.5 font-medium leading-tight whitespace-nowrap">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <span class="effect filter" ref="filterRef" />
    <span class="effect text" ref="textRef" />
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
const textRef = useTemplateRef<HTMLSpanElement>('textRef')

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

watch(activeIndex, (newIdx) => {
  if (!navRef.value || !containerRef.value) return
  const lis = navRef.value.querySelectorAll('li')
  const activeLi = lis[newIdx] as HTMLElement | undefined
  if (activeLi) {
    updateEffectPosition(activeLi)
    textRef.value?.classList.add('active')
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

const updateEffectPosition = (element: HTMLElement) => {
  if (!containerRef.value || !filterRef.value || !textRef.value) return
  const containerRect = containerRef.value.getBoundingClientRect()
  const pos = element.getBoundingClientRect()
  const styles = {
    left: `${pos.x - containerRect.x}px`,
    top: `${pos.y - containerRect.y}px`,
    width: `${pos.width}px`,
    height: `${pos.height}px`,
  }
  Object.assign(filterRef.value.style, styles)
  Object.assign(textRef.value.style, styles)
  textRef.value.innerText = element.innerText
}

const handleClick = (e: Event, index: number) => {
  const item = props.items[index]
  if (item?.external) return

  const target = e.currentTarget as HTMLElement
  const liEl = target.parentElement as HTMLElement
  if (activeIndex.value === index) return
  activeIndex.value = index
  updateEffectPosition(liEl)
  if (filterRef.value) {
    const particles = filterRef.value.querySelectorAll('.particle')
    particles.forEach(p => filterRef.value!.removeChild(p))
  }
  if (textRef.value) {
    textRef.value.classList.remove('active')
    void textRef.value.offsetWidth
    textRef.value.classList.add('active')
  }
  if (filterRef.value) {
    makeParticles(filterRef.value)
  }
}

onMounted(() => {
  const idx = computeActiveIndex()
  activeIndex.value = idx
  if (!navRef.value || !containerRef.value) return
  const lis = navRef.value.querySelectorAll('li')
  const activeLi = lis[idx] as HTMLElement | undefined
  if (activeLi) {
    updateEffectPosition(activeLi)
    textRef.value?.classList.add('active')
  }
  resizeObserver = new ResizeObserver(() => {
    if (!navRef.value) return
    const lis = navRef.value.querySelectorAll('li')
    const currentActiveLi = lis[activeIndex.value] as HTMLElement | undefined
    if (currentActiveLi) {
      updateEffectPosition(currentActiveLi)
    }
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
:root {
  --linear-ease: linear(
    0,
    0.068,
    0.19 2.7%,
    0.804 8.1%,
    1.037,
    1.199 13.2%,
    1.245,
    1.27 15.8%,
    1.274,
    1.272 17.4%,
    1.249 19.1%,
    0.996 28%,
    0.949,
    0.928 33.3%,
    0.926,
    0.933 36.8%,
    1.001 45.6%,
    1.013,
    1.019 50.8%,
    1.018 54.4%,
    1 63.1%,
    0.995 68%,
    1.001 85%,
    1
  );
}

.gooey-nav .effect {
  position: absolute;
  opacity: 1;
  pointer-events: none;
  display: grid;
  place-items: center;
  z-index: 1;
}

.gooey-nav .effect.text {
  color: white;
  transition: color 0.3s ease;
}

.gooey-nav .effect.text.active {
  color: black;
}

.gooey-nav .effect.filter {
  filter: blur(7px) contrast(100) blur(0);
  mix-blend-mode: lighten;
}

.gooey-nav .effect.filter::before {
  content: '';
  position: absolute;
  inset: -75px;
  z-index: -2;
  background: black;
}

.gooey-nav .effect.filter::after {
  content: '';
  position: absolute;
  inset: 0;
  background: white;
  transform: scale(0);
  opacity: 0;
  z-index: -1;
  border-radius: 9999px;
}

.gooey-nav .effect.active::after {
  animation: gooey-pill 0.3s ease both;
}

@keyframes gooey-pill {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.gooey-nav .particle,
.gooey-nav .point {
  display: block;
  opacity: 0;
  width: 20px;
  height: 20px;
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
  opacity: 1;
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

.gooey-nav li.gooey-active {
  color: black;
  text-shadow: none;
}

.gooey-nav li.gooey-active::after {
  opacity: 1;
  transform: scale(1);
}

.gooey-nav li::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: white;
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s ease;
  z-index: -1;
}
</style>
