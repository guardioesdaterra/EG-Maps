<script lang="ts">
export interface CarouselItem {
  title: string;
  description: string;
  id: number;
  icon: string;
  path?: string;
  path2d?: string;
  path3d?: string;
  color?: string;
}

export interface CarouselProps {
  items?: CarouselItem[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
}

export const DEFAULT_ITEMS: CarouselItem[] = [
  { title: 'Project Grants', description: 'Explore global grant initiatives and their impact on communities worldwide.', id: 1, icon: 'lucide:hand-heart', path2d: '/project-grants', path3d: '/project-grants/3d', color: '#10bfae' },
  { title: 'Endangered Species', description: 'Discover critically endangered species and their habitats around the world.', id: 2, icon: 'lucide:bird', path2d: '/endangered-species', path3d: '/endangered-species/3d', color: '#22c55e' },
  { title: 'Observatory of Vulcan', description: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.', id: 3, icon: 'lucide:microscope', path2d: '/vulcan-observatory', path3d: '/vulcan-observatory/3d', color: '#f59e0b' },
  { title: 'Active Crews', description: 'Explore Earth Guardians crews across 7 regions worldwide.', id: 4, icon: 'lucide:users-round', path: '/active-crews', color: '#38bdf8' },
  { title: 'Crew Projects', description: 'Large-scale and small-scale projects led by EG Crews around the world.', id: 5, icon: 'lucide:rocket', path: '/crew-projects', color: '#a78bfa' },
];
</script>

<script setup lang="ts">
import { Motion, useMotionValue, useTransform } from 'motion-v';
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

defineOptions({ name: 'Carousel' });

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

const props = withDefaults(defineProps<CarouselProps>(), {
  items: () => DEFAULT_ITEMS,
  baseWidth: 300,
  autoplay: false,
  autoplayDelay: 3000,
  pauseOnHover: false,
  loop: false,
  round: false
});

const containerPadding = 16;
const itemWidth = computed(() => props.baseWidth - containerPadding * 2);
const trackItemOffset = computed(() => itemWidth.value + GAP);

const carouselItems = computed(() => (props.loop ? [...props.items, props.items[0]] : props.items));
const currentIndex = ref<number>(0);
const prefersReduced = ref(false);

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
let autoplayTimer: number | null = null;

/* ── drag & motion ── */
const motionX = useMotionValue(0);
const isHovered = ref<boolean>(false);
const isResetting = ref<boolean>(false);

const dragConstraints = computed(() =>
  props.loop
    ? {}
    : {
        left: -trackItemOffset.value * (carouselItems.value.length - 1),
        right: 0
      }
);

const effectiveTransition = computed(() => (isResetting.value ? { duration: 0 } : SPRING_OPTIONS));

const MAX_ITEMS = 12;
const rotateYTransforms = Array.from({ length: MAX_ITEMS }, (_, index) =>
  useTransform(motionX, (xVal: number) => {
    const offset = trackItemOffset.value;
    const r0 = -(index + 1) * offset;
    const r1 = -index * offset;
    const r2 = -(index - 1) * offset;
    if (xVal <= r0) return 90;
    if (xVal >= r2) return -90;
    if (xVal <= r1) return 90 + ((xVal - r0) / (r1 - r0)) * (0 - 90);
    return 0 + ((xVal - r1) / (r2 - r1)) * (-90 - 0);
  })
);

const getRotateY = (index: number) => rotateYTransforms[index] ?? rotateYTransforms[0];

const handleAnimationComplete = () => {
  if (props.loop && currentIndex.value === carouselItems.value.length - 1) {
    isResetting.value = true;
    motionX.set(0);
    currentIndex.value = 0;
    setTimeout(() => {
      isResetting.value = false;
    }, 50);
  }
};

interface DragInfo {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}

let pointerDownX = 0;
let pointerDownY = 0;

const handlePointerDown = (e: PointerEvent) => {
  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
};

const handleDragEnd = (_: Event, info: DragInfo) => {
  const offset = info.offset.x;
  const velocity = info.velocity.x;

  if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
    if (props.loop && currentIndex.value === props.items.length - 1) {
      currentIndex.value = currentIndex.value + 1;
    } else {
      currentIndex.value = Math.min(currentIndex.value + 1, carouselItems.value.length - 1);
    }
  } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
    if (props.loop && currentIndex.value === 0) {
      currentIndex.value = props.items.length - 1;
    } else {
      currentIndex.value = Math.max(currentIndex.value - 1, 0);
    }
  }
};

const handleItemClick = (item: CarouselItem, e: PointerEvent) => {
  if (!item.path && !item.path2d && !item.path3d) return;
  const dx = e.clientX - pointerDownX;
  const dy = e.clientY - pointerDownY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) return;
  navigateTo(item.path2d || item.path3d || item.path || '/');
};

const setCurrentIndex = (index: number) => {
  currentIndex.value = index;
};

const stopAutoplay = () => {
  if (autoplayTimer !== null) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
};

const startAutoplay = () => {
  if (!props.autoplay || prefersReduced.value) return;
  if (props.pauseOnHover && isHovered.value) return;
  autoplayTimer = window.setInterval(() => {
    currentIndex.value = (() => {
      const prev = currentIndex.value;
      if (prev === props.items.length - 1 && props.loop) return prev + 1;
      if (prev === carouselItems.value.length - 1) return props.loop ? 0 : prev;
      return prev + 1;
    })();
  }, props.autoplayDelay);
};

const handleMouseEnter = () => {
  isHovered.value = true;
  if (props.pauseOnHover) stopAutoplay();
};

const handleMouseLeave = () => {
  isHovered.value = false;
  if (props.pauseOnHover) startAutoplay();
};

watch(
  [
    () => props.autoplay,
    () => props.autoplayDelay,
    isHovered,
    () => props.loop,
    () => props.items.length,
    () => carouselItems.value.length,
    () => props.pauseOnHover
  ],
  () => {
    stopAutoplay();
    startAutoplay();
  }
);

onMounted(() => {
  prefersReduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (props.pauseOnHover && containerRef.value) {
    containerRef.value.addEventListener('mouseenter', handleMouseEnter);
    containerRef.value.addEventListener('mouseleave', handleMouseLeave);
  }
  startAutoplay();
});

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('mouseenter', handleMouseEnter);
    containerRef.value.removeEventListener('mouseleave', handleMouseLeave);
  }
  stopAutoplay();
});
</script>

<template>
  <div
    ref="containerRef"
    :class="[
      'relative overflow-hidden',
      round ? 'rounded-full border border-white/[0.08] flex items-center justify-center' : 'rounded-2xl border border-white/[0.08]'
    ]"
    :style="{
      width: `${baseWidth}px`,
      ...(round && { height: `${baseWidth}px` })
    }"
    role="region"
    aria-label="Maps carousel"
  >
    <Motion
      tag="div"
      class="flex"
      drag="x"
      :drag-constraints="dragConstraints"
      :style="{
        width: itemWidth + 'px',
        gap: `${GAP}px`,
        perspective: 1000,
        perspectiveOrigin: round ? '50% 50%' : `${currentIndex * trackItemOffset + itemWidth / 2}px 50%`,
        x: motionX
      }"
      @pointerdown="handlePointerDown"
      @drag-end="handleDragEnd"
      :animate="{ x: -(currentIndex * trackItemOffset) }"
      :transition="effectiveTransition"
      @animation-complete="handleAnimationComplete"
    >
      <Motion
        v-for="(item, index) in carouselItems"
        :key="item.id + '-' + index"
        tag="div"
        :class="[
          'relative shrink-0 flex flex-col overflow-hidden',
          round
            ? 'items-center justify-center text-center'
            : 'items-start justify-between'
        ]"
        :style="{
          width: itemWidth + 'px',
          height: round ? itemWidth + 'px' : '100%',
          rotateY: getRotateY(index),
          background: 'var(--bg-secondary)',
          ...(round && { borderRadius: '50%' })
        }"
        :transition="effectiveTransition"
        @pointerup="(e: PointerEvent) => handleItemClick(item, e)"
      >
        <div :class="round ? 'p-0 m-0' : 'mb-4 p-5'">
          <span
            class="flex justify-center items-center rounded-full w-[36px] h-[36px]"
            :class="round ? 'bg-white/[0.06]' : 'bg-white/[0.06]'"
          >
            <Icon :name="item.icon" class="h-5 w-5 text-white/70" />
          </span>
        </div>
        <div :class="round ? 'px-4 pb-6' : 'p-5'">
          <div
            class="mb-1 text-white font-semibold"
            :class="round ? 'text-sm leading-snug' : 'text-base leading-tight'"
          >
            {{ item.title }}
          </div>
          <p
            :class="[
              'text-white/50 leading-relaxed',
              round ? 'text-xs line-clamp-2 mt-0.5' : 'text-sm'
            ]"
          >
            {{ item.description }}
          </p>
          <div v-if="(item.path2d || item.path3d) && !round" class="mt-3 flex gap-2">
            <button
              v-if="item.path2d"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border transition-colors"
              :style="{
                borderColor: `${item.color}40`,
                color: item.color,
                background: `${item.color}10`,
              }"
              @click.stop="navigateTo(item.path2d!)"
            >
              <Icon name="lucide:map" class="w-3 h-3" />
              2D
            </button>
            <button
              v-if="item.path3d"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded border transition-colors"
              :style="{
                borderColor: `${item.color}40`,
                color: item.color,
                background: `${item.color}10`,
              }"
              @click.stop="navigateTo(item.path3d!)"
            >
              <Icon name="lucide:globe" class="w-3 h-3" />
              3D
            </button>
          </div>
        </div>
        <div
          v-if="item.color && !round"
          class="absolute bottom-2.5 right-2.5 h-1.5 w-1.5 rounded-full"
          :style="{ background: item.color, opacity: 0.5 }"
        />
      </Motion>
    </Motion>

    <div :class="['flex w-full justify-center', round ? 'absolute z-20 bottom-12 left-1/2 -translate-x-1/2' : '']">
      <div class="flex justify-between mt-4 px-8 w-[150px]">
        <button
          v-for="(_, index) in items"
          :key="index"
          :class="[
            'h-2 w-2 rounded-full cursor-pointer transition-all duration-150',
            currentIndex % items.length === index
              ? round
                ? 'bg-white'
                : 'bg-white/60'
              : round
                ? 'bg-white/20'
                : 'bg-white/10'
          ]"
          :style="{
            transform: currentIndex % items.length === index ? 'scale(1.2)' : 'scale(1)'
          }"
          :aria-label="`Go to slide ${index + 1}: ${items[index].title}`"
          @click="setCurrentIndex(index)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
