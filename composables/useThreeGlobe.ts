import { onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

export interface GlobeProject {
  latitude: number
  longitude: number
  direct_beneficiaries?: number
  indirect_beneficiaries?: number
}

export function useThreeGlobe(
  canvasRef: Ref<HTMLCanvasElement | null>,
  projects: GlobeProject[] = [],
) {
  let cleanup: (() => void) | null = null
  let resolveReady: (() => void) | null = null
  const ready = new Promise<void>(r => { resolveReady = r })

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`)
      if (existing) { resolve(); return }
      const s = document.createElement('script')
      s.src = src
      s.onload = () => resolve()
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  function latLngToVector3(lat: number, lng: number, radius: number) {
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    const x = -(radius * Math.sin(phi) * Math.cos(theta))
    const z = radius * Math.sin(phi) * Math.sin(theta)
    const y = radius * Math.cos(phi)
    return { x, y, z }
  }

  async function init() {
    const SCRIPTS = [
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
    ]
    await Promise.all(SCRIPTS.map(loadScript))

    const win = window as unknown as { THREE: unknown; gsap: unknown; ScrollTrigger: unknown }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE: any = win.THREE
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gsap: any = win.gsap
    if (!THREE || !gsap) { resolveReady?.(); return }

    gsap.registerPlugin(win.ScrollTrigger)

    const canvas = canvasRef.value
    if (!canvas) { resolveReady?.(); return }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x08080a)
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x08080a, 1)

    const loader = new THREE.TextureLoader()
    const earthMap = loader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg')
    earthMap.anisotropy = renderer.capabilities.getMaxAnisotropy()
    earthMap.minFilter = THREE.LinearMipmapLinearFilter
    earthMap.magFilter = THREE.LinearFilter

    const GLOBE_RADIUS = 2
    const geo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64)
    const mat = new THREE.MeshPhongMaterial({ map: earthMap, specular: new THREE.Color('#111111'), shininess: 10 })
    const globe = new THREE.Mesh(geo, mat)
    scene.add(globe)

    // ── Neon glowing markers ──────────────────────────────────
    const NEON_COLOR = 0x00ff85
    const markerGroup = new THREE.Group()
    globe.add(markerGroup)

    const maxBeneficiaries = projects.reduce(
      (max, p) => Math.max(max, (p.direct_beneficiaries || 0) + (p.indirect_beneficiaries || 0)),
      1,
    )

    projects.forEach((project) => {
      const pos = latLngToVector3(project.latitude, project.longitude, GLOBE_RADIUS)
      const total = (project.direct_beneficiaries || 0) + (project.indirect_beneficiaries || 0)
      const intensity = Math.max(0.3, Math.min(1, total / maxBeneficiaries))

      // Core dot
      const dotGeo = new THREE.SphereGeometry(0.018 * (0.6 + intensity * 0.8), 12, 12)
      const dotMat = new THREE.MeshBasicMaterial({ color: NEON_COLOR })
      const dot = new THREE.Mesh(dotGeo, dotMat)
      dot.position.set(pos.x, pos.y, pos.z)
      markerGroup.add(dot)

      // Outer glow ring
      const ringGeo = new THREE.RingGeometry(0.025 * (0.6 + intensity * 0.8), 0.04 * (0.6 + intensity * 0.8), 24)
      const ringMat = new THREE.MeshBasicMaterial({
        color: NEON_COLOR,
        transparent: true,
        opacity: 0.35 * intensity,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.set(pos.x, pos.y, pos.z)
      ring.lookAt(0, 0, 0)
      markerGroup.add(ring)

      // Pulsing outer glow
      const pulseGeo = new THREE.RingGeometry(0.04 * (0.6 + intensity * 0.8), 0.06 * (0.6 + intensity * 0.8), 24)
      const pulseMat = new THREE.MeshBasicMaterial({
        color: NEON_COLOR,
        transparent: true,
        opacity: 0.15 * intensity,
        side: THREE.DoubleSide,
      })
      const pulse = new THREE.Mesh(pulseGeo, pulseMat)
      pulse.position.set(pos.x, pos.y, pos.z)
      pulse.lookAt(0, 0, 0)
      pulse.userData = { baseOpacity: 0.15 * intensity, phase: Math.random() * Math.PI * 2 }
      markerGroup.add(pulse)
    })

    const starGeo = new THREE.BufferGeometry()
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.015 })
    const starVerts: number[] = []
    for (let i = 0; i < 6000; i++) starVerts.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000)
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3))
    scene.add(new THREE.Points(starGeo, starMat))

    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
    mainLight.position.set(5, 3, 5)
    scene.add(mainLight)
    const rimLight = new THREE.PointLight(0x00ff85, 0.6)
    rimLight.position.set(-5, -3, -5)
    scene.add(rimLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(-3, 1, 2)
    scene.add(fillLight)
    camera.position.z = 6

    let mouseX = 0, mouseY = 0
    const mouseHandler = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.2
    }
    window.addEventListener('mousemove', mouseHandler)

    gsap.to(globe.rotation, { y: Math.PI * 2, scrollTrigger: { trigger: '#ui-overlay', start: 'top top', end: 'bottom bottom', scrub: 1.5 } })
    gsap.to(globe.scale, { x: 2.5, y: 2.5, z: 2.5, ease: 'power2.out', scrollTrigger: { trigger: '#open-dashboard', start: 'top bottom', end: 'bottom top', scrub: 3, invalidateOnRefresh: true } })
    gsap.to(camera.position, { z: 2.8, ease: 'power2.out', scrollTrigger: { trigger: '#open-dashboard', start: 'top bottom', end: 'bottom top', scrub: 3, invalidateOnRefresh: true } })

    let targetX = 0
    let currentX = 0

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: '#hero',
        start: 'bottom center',
        end: 'bottom top',
        scrub: 1.5,
        onUpdate: (self) => { targetX = 2 * self.progress },
      })
      ScrollTrigger.create({
        trigger: '#details',
        start: 'top center',
        end: 'bottom center',
        scrub: 1.5,
        onUpdate: (self) => { targetX = 2 - 4 * self.progress },
      })
      ScrollTrigger.create({
        trigger: '#join',
        start: 'top center',
        end: 'bottom center',
        scrub: 1.5,
        onUpdate: (self) => { targetX = -2 + 2 * self.progress },
      })

      gsap.from('.impact-card', { opacity: 0, x: -50, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '#details', start: 'top center' } })
      gsap.from('.grants-body', { opacity: 0, y: 80, duration: 1.2, force3D: true, scrollTrigger: { trigger: '#join', start: 'top 75%', toggleActions: 'play none none none' } })
      gsap.from('.dash-card', { opacity: 0, y: 60, duration: 1, stagger: 0.1, force3D: true, scrollTrigger: { trigger: '#open-dashboard', start: 'top 75%', toggleActions: 'play none none none' } })
    })

    let time = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      time += 0.016
      scene.rotation.y += (mouseX - scene.rotation.y) * 0.05
      scene.rotation.x += (mouseY - scene.rotation.x) * 0.05

      targetX = Math.max(-3.5, Math.min(3.5, targetX))
      currentX += (targetX - currentX) * 0.08
      globe.position.x = currentX

      markerGroup.children.forEach((child: any) => {
        if (child.userData?.baseOpacity != null) {
          const { baseOpacity, phase } = child.userData
          child.material.opacity = baseOpacity * (0.5 + 0.5 * Math.sin(time * 2 + phase))
        }
      })

      renderer.render(scene, camera)
    }
    let rafId = requestAnimationFrame(animate)

    const resizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', resizeHandler)

    cleanup = () => {
      window.removeEventListener('resize', resizeHandler)
      window.removeEventListener('mousemove', mouseHandler)
      cancelAnimationFrame(rafId)
      ctx.revert()
      renderer.dispose()
    }

    resolveReady?.()
  }

  onBeforeUnmount(() => cleanup?.())

  return { init, ready }
}
