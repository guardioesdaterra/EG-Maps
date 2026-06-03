export interface ForceNode {
  id: string
  x: number
  y: number
  vx?: number
  vy?: number
  mass?: number
}

export interface ForceEdge {
  source: string
  target: string
  weight?: number
}

export interface ForceLayoutOptions {
  width: number
  height: number
  iterations?: number
  /** Ideal edge length. Default: sqrt(area / nodeCount) * 1.2 */
  k?: number
  /** Repulsion constant. Default 1 */
  repulsion?: number
  /** Spring stiffness. Default 0.4 — high enough to keep connected nodes
   * visibly clustered even with strong repulsion. */
  springStiffness?: number
  /** Initial temperature. Default width / 10 */
  initialTemperature?: number
  /** Cooling factor per iteration. Default 0.975 — slow enough to let the
   * system reach equilibrium. */
  cooling?: number
  /** Center the graph. Default true */
  center?: boolean
  /** Padding inside viewport (px). Default 30 */
  padding?: number
  /** Clamp positions to avoid going offscreen. Default true */
  clamp?: boolean
  /** Seed for reproducible layouts. Default 0. */
  seed?: number
}

interface InternalNode extends ForceNode {
  vx: number
  vy: number
  mass: number
}

/**
 * Mulberry32 PRNG — small, fast, deterministic.
 * Used so repeated layouts with the same seed are reproducible.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fruchterman-Reingold force-directed layout.
 *
 * Each pair of nodes has a repulsive force (Coulomb-like, ~1/distance).
 * Each edge has an attractive force (Hooke-like, ~distance).
 * The system is integrated with velocity damping and a cooling schedule so
 * it converges to a stable layout in O(iterations * nodes²) time. For the
 * corporate network (≈30 nodes, ≈40 edges) this runs in single-digit ms.
 *
 * The result is a stable layout that highlights the network's community
 * structure: well-connected subgraphs cluster together visually, and weakly
 * connected nodes are pushed apart.
 */
export function computeForceLayout(
  nodes: ForceNode[],
  edges: ForceEdge[],
  options: ForceLayoutOptions,
): ForceNode[] {
  const {
    width,
    height,
    iterations = 500,
    repulsion = 1,
    springStiffness = 0.4,
    center: shouldCenter = true,
    padding = 30,
    clamp = true,
    seed = 0,
  } = options

  const nodeCount = nodes.length
  if (nodeCount === 0) return []

  const rand = mulberry32(seed)
  const area = width * height
  const k = options.k ?? Math.sqrt(area / nodeCount) * 1.2
  const initialTemperature = options.initialTemperature ?? Math.max(width, height) / 10
  const cooling = options.cooling ?? 0.975

  // Deep-clone so we can mutate velocity/position without affecting caller
  const internal: InternalNode[] = nodes.map(n => ({
    ...n,
    vx: 0,
    vy: 0,
    mass: n.mass ?? 1,
  }))

  // Build edge index for O(1) lookup of adjacency
  const indexById = new Map<string, InternalNode>()
  internal.forEach(n => indexById.set(n.id, n))

  // Seed initial positions on a circle (helps symmetry-break)
  const cx0 = width / 2
  const cy0 = height / 2
  const r0 = Math.min(width, height) * 0.35
  internal.forEach((n, i) => {
    if (n.x === undefined || n.y === undefined || Number.isNaN(n.x) || Number.isNaN(n.y)) {
      const angle = (i / internal.length) * Math.PI * 2 + rand() * 0.1
      n.x = cx0 + Math.cos(angle) * r0
      n.y = cy0 + Math.sin(angle) * r0
    }
  })

  let temperature = initialTemperature

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsive forces (n^2 — fine for small graphs)
    for (let i = 0; i < internal.length; i++) {
      const a = internal[i]
      for (let j = i + 1; j < internal.length; j++) {
        const b = internal[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 0.01) {
          // Jitter to escape exact overlap
          dx = (rand() - 0.5) * 0.1
          dy = (rand() - 0.5) * 0.1
          dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        }
        const force = (repulsion * k * k) / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx / a.mass
        a.vy += fy / a.mass
        b.vx -= fx / b.mass
        b.vy -= fy / b.mass
      }
    }

    // Attractive forces along edges (Hooke's law)
    for (const e of edges) {
      const a = indexById.get(e.source)
      const b = indexById.get(e.target)
      if (!a || !b) continue
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
      const weight = e.weight ?? 1
      const force = (dist * dist / k) * springStiffness * weight
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx -= fx * a.mass
      a.vy -= fy * a.mass
      b.vx += fx * b.mass
      b.vy += fy * b.mass
    }

    // Apply velocity with temperature cap (simulated annealing)
    for (const n of internal) {
      const vmag = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
      if (vmag > temperature) {
        n.vx = (n.vx / vmag) * temperature
        n.vy = (n.vy / vmag) * temperature
      }
      n.x += n.vx
      n.y += n.vy

      if (clamp) {
        if (n.x < padding) n.x = padding
        if (n.x > width - padding) n.x = width - padding
        if (n.y < padding) n.y = padding
        if (n.y > height - padding) n.y = height - padding
      }

      // Velocity damping
      n.vx *= 0.85
      n.vy *= 0.85
    }

    temperature *= cooling
  }

  if (shouldCenter) {
    // Compute centroid and shift so it sits in the middle
    let sx = 0
    let sy = 0
    for (const n of internal) { sx += n.x; sy += n.y }
    sx /= internal.length
    sy /= internal.length
    const dx = (width / 2) - sx
    const dy = (height / 2) - sy
    if (clamp) {
      // Only shift if it keeps everything inside the padded area
      let canShift = true
      for (const n of internal) {
        if (n.x + dx < padding || n.x + dx > width - padding) { canShift = false; break }
        if (n.y + dy < padding || n.y + dy > height - padding) { canShift = false; break }
      }
      if (canShift) for (const n of internal) { n.x += dx; n.y += dy }
    } else {
      for (const n of internal) { n.x += dx; n.y += dy }
    }
  }

  // Return original input shape (without internal velocity fields)
  return internal.map(({ id, x, y, mass }) => ({ id, x, y, mass }))
}
