<template>
  <Transition name="fade">
    <div v-if="visible" class="rede-overlay" @click.self="close">
      <div class="rede-modal">
        <div class="rede-header">
          <div>
            <span class="rede-badge">CORPORATE NETWORK</span>
            <h2 class="rede-title">Rede Corporativa</h2>
            <p class="rede-subtitle">Enterprise connections in the Brazilian REE sector</p>
          </div>
          <button class="rede-close" @click="close" aria-label="Close">&times;</button>
        </div>

        <div class="rede-canvas-wrap">
          <canvas ref="canvasRef" class="rede-canvas" />
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

        <div v-if="focusedEnterprise" class="rede-detail-bar">
          <div class="rede-detail-info">
            <strong :style="{ color: focusedEnterprise.color }">{{ focusedEnterprise.name }}</strong>
            <span class="text-zinc-400 text-[10px]">{{ focusedEnterprise.country }} · {{ focusedEnterprise.sector }}</span>
          </div>
          <button class="rede-detail-fly" @click="flyTo(focusedEnterprise)">📍 Fly to</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { ENTERPRISES, CORPORATE_CONNECTIONS, type EnterpriseHQ } from '@/lib/enterprise-data'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; flyToEnterprise: [_name: string] }>()
const close = () => { focusedEnterprise.value = null; emit('close') }
const flyTo = (e: EnterpriseHQ) => { emit('flyToEnterprise', e.name) }

const canvasRef = ref<HTMLCanvasElement | null>(null)
const focusedEnterprise = ref<EnterpriseHQ | null>(null)
const hoveredEdge = ref<{ from: string; to: string; type: string; label?: string } | null>(null)
const tooltipPos = ref({ left: '0px', top: '0px' })

const legendItems = [
  { key: 'shareholding', label: 'Shareholding', color: '#e74c3c' },
  { key: 'subsidiary', label: 'Subsidiary', color: '#3498db' },
  { key: 'joint_venture', label: 'Joint Venture', color: '#27ae60' },
  { key: 'board_overlap', label: 'Board Overlap', color: '#8e44ad' },
  { key: 'partnership', label: 'Partnership', color: '#f39c12' },
]

function getConnectionColor(type: string): string {
  return legendItems.find(l => l.key === type)?.color || '#666'
}

interface LayoutNode { x: number; y: number; ent: EnterpriseHQ; connections: number }

function layoutGraph(cw: number, ch: number): LayoutNode[] {
  const cx = cw / 2
  const cy = ch / 2
  const radius = Math.min(cw, ch) * 0.32
  const nodes: LayoutNode[] = ENTERPRISES.map((ent, i) => {
    const angle = (i / ENTERPRISES.length) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, ent, connections: 0 }
  })
  CORPORATE_CONNECTIONS.forEach(conn => {
    const fi = nodes.findIndex(n => n.ent.name === conn.from)
    const ti = nodes.findIndex(n => n.ent.name === conn.to)
    if (fi >= 0) nodes[fi].connections++
    if (ti >= 0) nodes[ti].connections++
  })
  return nodes
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

  // Draw edges
  CORPORATE_CONNECTIONS.forEach(conn => {
    const from = nodeMap.get(conn.from)
    const to = nodeMap.get(conn.to)
    if (!from || !to) return
    const color = getConnectionColor(conn.type)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    const cpx = (from.x + to.x) / 2
    const cpy = (from.y + to.y) / 2 - 15
    ctx.quadraticCurveTo(cpx, cpy, to.x, to.y)
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.setLineDash([])
  })

  // Highlight focused node
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

  // Draw nodes
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

    // Label
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

watch(() => props.visible, (v) => {
  if (v) setTimeout(drawGraph, 50)
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
  position: fixed; inset: 0; z-index: 2147483647;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.rede-modal {
  width: 100%; max-width: 800px; max-height: 90vh;
  background: #0a0a0f; border: 1px solid rgba(52,152,219,0.2);
  border-radius: 16px; overflow: hidden;
  display: flex; flex-direction: column;
}
.rede-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.rede-badge {
  font-size: 9px; font-weight: 800; letter-spacing: 0.1em;
  color: #5dade2; padding: 2px 6px; border-radius: 4px;
  background: rgba(52,152,219,0.12);
}
.rede-title { font-size: 16px; font-weight: 800; color: #eee; margin: 2px 0 0; }
.rede-subtitle { font-size: 10px; color: #666; margin: 0; }
.rede-close {
  background: none; border: none; color: #666; font-size: 24px;
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.rede-close:hover { color: #fff; }
.rede-canvas-wrap {
  flex: 1; position: relative; min-height: clamp(280px, 50vh, 400px);
  margin: 0; overflow: hidden;
}
.rede-canvas {
  width: 100%; height: 100%; position: absolute; inset: 0;
  display: block;
}
.rede-tooltip {
  position: absolute; padding: 6px 10px; border-radius: 8px;
  background: rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.1);
  color: #ddd; font-size: 11px; pointer-events: none;
  white-space: nowrap; transform: translate(-50%, -120%);
}
.rede-edge-type {
  display: inline-block; margin-left: 6px; padding: 1px 5px;
  border-radius: 3px; color: #fff; font-size: 9px; font-weight: 700;
}
.rede-legend {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 10px 20px; border-top: 1px solid rgba(255,255,255,0.06);
}
.rede-legend-item {
  font-size: 10px; color: #999; display: flex; align-items: center; gap: 4px;
}
.rede-legend-dot {
  width: 8px; height: 8px; border-radius: 50%; display: inline-block;
}
.rede-detail-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; border-top: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
}
.rede-detail-info {
  display: flex; flex-direction: column; gap: 1px;
}
.rede-detail-fly {
  background: rgba(52,152,219,0.15); border: 1px solid rgba(52,152,219,0.3);
  color: #5dade2; padding: 4px 10px; border-radius: 6px;
  font-size: 10px; font-weight: 700; cursor: pointer;
}
.rede-detail-fly:hover { background: rgba(52,152,219,0.25); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
