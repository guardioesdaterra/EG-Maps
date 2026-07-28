/**
 * components/RedeCorporativa.vue
 * @why Corporate/enterprise partner network visualization with connection graph
 * @component RedeCorporativa
 * @props visible: boolean
 * @emits close: [], flyToEnterprise: [_name: string]
 * @deps vue (ref, computed, onMounted, watch, onUnmounted); @/lib/enterprise-data (ENTERPRISES, CORPORATE_CONNECTIONS, type EnterpriseHQ); @/composables/useFocusTrap (useFocusTrap); @/composables/useForceLayout (computeForceLayout, type ForceNode); @/composables/useI18n (useI18n)
 */
<template>
  <Transition name="fade">
    <div v-if="visible" class="rede-overlay" @click.self="close" @keydown.esc="close">
      <div ref="modalRef" class="rede-modal" role="dialog" aria-modal="true" aria-labelledby="rede-modal-title">
        <div class="rede-header">
          <div>
            <span class="rede-badge">CORPORATE NETWORK</span>
            <h2 id="rede-modal-title" class="rede-title">Rede Corporativa</h2>
            <p class="rede-subtitle">Enterprise connections in the Brazilian REE sector</p>
          </div>
          <button class="rede-close" @click="close" aria-label="Close"><Icon name="lucide:x" class="w-4 h-4" /></button>
        </div>

        <div class="rede-canvas-wrap">
          <canvas ref="canvasRef" aria-hidden="true" class="rede-canvas" />
          <div v-if="hoveredEdge" class="rede-tooltip" :style="tooltipPos">
            <strong>{{ hoveredEdge.from }}</strong> → <strong>{{ hoveredEdge.to }}</strong>
            <span class="rede-edge-type" :style="{ background: getConnectionColor(hoveredEdge.type) }">{{ hoveredEdge.label || hoveredEdge.type }}</span>
          </div>
        </div>

        <div class="rede-legend">
          <span v-for="l in legendItems" :key="l.key" class="rede-legend-item">
            <span class="rede-legend-dot" :style="{ background: l.color }" />
            {{ l.label }}
          </span>
        </div>

        <div class="rede-toolbar">
          <button class="rede-toolbar-btn" @click="relayout" :aria-label="t('observatory.network.relayout')">
            <span>↻</span> {{ t('observatory.network.relayout') }}
          </button>
          <span class="rede-toolbar-hint">{{ t('observatory.network.clickHint') }}</span>
        </div>

        <div v-if="focusedEnterprise" class="rede-detail-bar">
          <div class="rede-detail-info">
            <strong :style="{ color: focusedEnterprise.color }">{{ focusedEnterprise.name }}</strong>
            <span class="text-zinc-400 text-[clamp(10px,1.5vw,13px)]">{{ focusedEnterprise.country }} · {{ focusedEnterprise.sector }}</span>
          </div>
          <button class="rede-detail-fly" @click="flyTo(focusedEnterprise)">📍 Fly to</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { ENTERPRISES, CORPORATE_CONNECTIONS, type EnterpriseHQ } from '@/lib/enterprise-data'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { computeForceLayout, type ForceNode } from '@/composables/useForceLayout'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; flyToEnterprise: [_name: string] }>()
const close = () => { focusedEnterprise.value = null; emit('close') }
const flyTo = (e: EnterpriseHQ) => { emit('flyToEnterprise', e.name) }

let layoutSeed = 42
function relayout() {
  layoutSeed = (layoutSeed + 1) >>> 0
  drawGraph()
}

const modalRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const focusedEnterprise = ref<EnterpriseHQ | null>(null)
const isActive = computed(() => props.visible)
useFocusTrap(modalRef, { active: isActive })
const hoveredEdge = ref<{ from: string; to: string; type: string; label?: string } | null>(null)
const tooltipPos = ref({ left: '0px', top: '0px' })

const legendItems = [
  { key: 'shareholding', label: 'Shareholding', color: 'var(--danger)' },
  { key: 'subsidiary', label: 'Subsidiary', color: 'var(--info)' },
  { key: 'joint_venture', label: 'Joint Venture', color: 'var(--success)' },
  { key: 'board_overlap', label: 'Board Overlap', color: 'var(--purple)' },
  { key: 'partnership', label: 'Partnership', color: 'var(--warning)' },
]

function getConnectionColor(type: string): string {
  return legendItems.find(l => l.key === type)?.color || 'var(--text-muted)'
}

interface LayoutNode { id: string; x: number; y: number; ent: EnterpriseHQ; connections: number }

function layoutGraph(cw: number, ch: number): LayoutNode[] {
  const connectionCounts = new Map<string, number>()
  for (const e of ENTERPRISES) connectionCounts.set(e.name, 0)
  for (const conn of CORPORATE_CONNECTIONS) {
    connectionCounts.set(conn.from, (connectionCounts.get(conn.from) || 0) + 1)
    connectionCounts.set(conn.to, (connectionCounts.get(conn.to) || 0) + 1)
  }

  const inputNodes: ForceNode[] = ENTERPRISES.map(e => ({
    id: e.name,
    x: 0, y: 0,
    mass: 1 + (connectionCounts.get(e.name) || 0) * 0.2,
  }))
  const inputEdges = CORPORATE_CONNECTIONS.map(c => ({
    source: c.from,
    target: c.to,
    weight: 1.5,
  }))

  const positioned = computeForceLayout(inputNodes, inputEdges, {
    width: cw,
    height: ch,
    iterations: 300,
    padding: 50,
    seed: layoutSeed,
  })

  const byId = new Map(positioned.map(p => [p.id, p]))
  return ENTERPRISES.map(ent => {
    const p = byId.get(ent.name)
    return {
      id: ent.name,
      x: p?.x ?? cw / 2,
      y: p?.y ?? ch / 2,
      ent,
      connections: connectionCounts.get(ent.name) || 0,
    }
  })
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null
let cachedNodes: LayoutNode[] = []

function getNodeAt(mx: number, my: number): LayoutNode | null {
  for (const n of cachedNodes) {
    const r = Math.min(12 + n.connections * 2, 32)
    const dx = mx - n.x
    const dy = my - n.y
    if (dx * dx + dy * dy <= r * r) return n
  }
  return null
}

function hitTestEdge(mx: number, my: number): typeof CORPORATE_CONNECTIONS[0] | null {
  const nodeMap = new Map(cachedNodes.map(n => [n.ent.name, n]))
  for (const conn of CORPORATE_CONNECTIONS) {
    const from = nodeMap.get(conn.from)
    const to = nodeMap.get(conn.to)
    if (!from || !to) continue
    const cpx = (from.x + to.x) / 2
    const cpy = (from.y + to.y) / 2 - 15
    const steps = 20
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const bx = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cpx + t * t * to.x
      const by = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cpy + t * t * to.y
      const dx = mx - bx
      const dy = my - by
      if (dx * dx + dy * dy <= 100) return conn
    }
  }
  return null
}

function onCanvasClick(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const node = getNodeAt(mx, my)
  focusedEnterprise.value = node ? node.ent : null
}

function onCanvasMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const node = getNodeAt(mx, my)
  const edge = node ? null : hitTestEdge(mx, my)
  canvas.style.cursor = node || edge ? 'pointer' : 'default'
  if (edge) {
    hoveredEdge.value = { from: edge.from, to: edge.to, type: edge.type, label: edge.label }
    tooltipPos.value = { left: e.clientX + 'px', top: e.clientY + 'px' }
  } else {
    hoveredEdge.value = null
  }
}

function onCanvasLeave() {
  hoveredEdge.value = null
}

function drawGraph() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.parentElement!.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = rect.width
  const h = rect.height
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, w, h)

  cachedNodes = layoutGraph(w, h)
  const nodeMap = new Map(cachedNodes.map(n => [n.ent.name, n]))

  CORPORATE_CONNECTIONS.forEach(conn => {
    const from = nodeMap.get(conn.from)
    const to = nodeMap.get(conn.to)
    if (!from || !to) return
    const color = getConnectionColor(conn.type)
    const edgeStyle = {
      subsidiary:    { width: 3,   dash: [] as number[], alpha: 0.8 },
      shareholding:  { width: 2.2, dash: [6, 3], alpha: 0.65 },
      joint_venture: { width: 1.8, dash: [4, 4], alpha: 0.6 },
      board_overlap: { width: 1.2, dash: [2, 4], alpha: 0.4 },
      partnership:   { width: 1.5, dash: [8, 4], alpha: 0.5 },
    }[conn.type] || { width: 1.5, dash: [5, 3], alpha: 0.5 }
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    const cpx = (from.x + to.x) / 2
    const cpy = (from.y + to.y) / 2 - 15
    ctx.quadraticCurveTo(cpx, cpy, to.x, to.y)
    ctx.strokeStyle = color
    ctx.globalAlpha = edgeStyle.alpha
    ctx.lineWidth = edgeStyle.width
    ctx.setLineDash(edgeStyle.dash)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.setLineDash([])
  })

  cachedNodes.forEach(n => {
    if (focusedEnterprise.value && n.ent.name === focusedEnterprise.value.name) {
      const r = Math.min(12 + n.connections * 2, 32)
      ctx.beginPath()
      ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  })

  cachedNodes.forEach(n => {
    const r = Math.min(12 + n.connections * 2, 32)
    const grad = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r)
    grad.addColorStop(0, lightenColor(n.ent.color, 30))
    grad.addColorStop(1, n.ent.color)
    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    const label = n.ent.name.slice(0, 2).toUpperCase()
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.max(9, r * 0.55)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, n.x, n.y)
  })
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + percent)
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent)
  const b = Math.min(255, (num & 0x0000FF) + percent)
  return `rgb(${r},${g},${b})`
}

function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(drawGraph, 150)
}

let visibilityTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.visible, (v) => {
  if (visibilityTimer) clearTimeout(visibilityTimer)
  if (v) visibilityTimer = setTimeout(drawGraph, 50)
})

onMounted(() => {
  window.addEventListener('resize', onResize)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.addEventListener('click', onCanvasClick)
    canvas.addEventListener('mousemove', onCanvasMove)
    canvas.addEventListener('mouseleave', onCanvasLeave)
  }
})

onUnmounted(() => {
  if (visibilityTimer) clearTimeout(visibilityTimer)
  window.removeEventListener('resize', onResize)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('click', onCanvasClick)
    canvas.removeEventListener('mousemove', onCanvasMove)
    canvas.removeEventListener('mouseleave', onCanvasLeave)
  }
})

</script>

<style scoped>
.rede-overlay {
  position: fixed; inset: 0; z-index: var(--obs-z-modal-backdrop);
  background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: clamp(10px, 3vw, 20px);
}
.rede-modal {
  width: 100%; max-width: min(800px, 95vw); max-height: 90vh;
  background: var(--obs-panel-bg-dark); border: 1px solid var(--obs-panel-border);
  border-radius: 14px; overflow: hidden;
  display: flex; flex-direction: column;
}
.rede-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: clamp(10px, 2.5vw, 16px) clamp(12px, 3vw, 20px) clamp(8px, 2vw, 12px); border-bottom: 1px solid var(--glass-border);
}
.rede-badge {
  font-size: clamp(9px, 1.4vw, 12px); font-weight: 800; letter-spacing: 0.1em;
  color: var(--info); padding: 2px 6px; border-radius: 4px;
  background: var(--info-bg);
}
.rede-title { font-size: clamp(12px, 3vw, 16px); font-weight: 800; color: var(--text-primary); margin: 2px 0 0; }
.rede-subtitle { font-size: clamp(8px, 2vw, 10px); color: var(--text-muted); margin: 0; }
.rede-close {
  background: none; border: none; color: var(--text-muted); font-size: clamp(18px, 4vw, 24px);
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.rede-close:hover { color: var(--bg-tertiary); }
.rede-canvas-wrap {
  flex: 1; position: relative; min-height: clamp(280px, 50vh, 400px);
  margin: 0; overflow: hidden;
}
.rede-canvas {
  width: 100%; height: 100%; position: absolute; inset: 0;
  display: block;
}
.rede-tooltip {
  position: absolute; padding: clamp(4px, 1.5vw, 6px) clamp(6px, 1.5vw, 10px); border-radius: 8px;
  background: var(--bg-primary); border: 1px solid var(--panel-border);
  color: var(--text-primary); font-size: clamp(11px, 1.6vw, 14px); pointer-events: none;
  white-space: nowrap; transform: translate(-50%, -120%);
}
.rede-edge-type {
  display: inline-block; margin-left: 6px; padding: 1px 5px;
  border-radius: 3px; color: var(--bg-tertiary); font-size: clamp(9px, 1.4vw, 12px); font-weight: 700;
}
.rede-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: clamp(4px, 1vw, 6px) clamp(10px, 3vw, 20px); gap: clamp(7px, 1.5vw, 12px);
  border-top: 1px solid var(--glass-border-light);
  background: var(--glass-border-light);
}
.rede-toolbar-btn {
  background: rgba(52,152,219,0.1); border: 1px solid rgba(52,152,219,0.25);
  color: var(--info); padding: 3px 9px; border-radius: 5px;
  font-size: clamp(10px, 1.5vw, 13px); font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
}
.rede-toolbar-btn:hover { background: rgba(52,152,219,0.2); }
.rede-toolbar-hint { font-size: clamp(9px, 1.4vw, 12px); color: var(--text-muted); }

.rede-legend {
  display: flex; flex-wrap: wrap; gap: clamp(5px, 1.5vw, 8px);
  padding: clamp(6px, 2vw, 10px) clamp(10px, 3vw, 20px); border-top: 1px solid var(--glass-border);
}
.rede-legend-item {
  font-size: clamp(10px, 1.5vw, 13px); color: var(--text-muted); display: flex; align-items: center; gap: clamp(4px, 0.5vw, 6px);
}
.rede-legend-dot {
  width: 8px; height: 8px; border-radius: 50%; display: inline-block;
}
.rede-detail-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: clamp(6px, 2vw, 10px) clamp(10px, 3vw, 20px); border-top: 1px solid var(--glass-border);
  background: var(--glass-border-light);
}
.rede-detail-info {
  display: flex; flex-direction: column; gap: 1px;
}
.rede-detail-fly {
  background: rgba(52,152,219,0.15); border: 1px solid rgba(52,152,219,0.3);
  color: var(--info); padding: 4px 10px; border-radius: 6px;
  font-size: clamp(10px, 1.5vw, 13px); font-weight: 700; cursor: pointer;
}
.rede-detail-fly:hover { background: rgba(52,152,219,0.25); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
