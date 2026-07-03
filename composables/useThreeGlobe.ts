import { onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

export function useThreeGlobe(canvasRef: Ref<HTMLCanvasElement | null>) {
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

    const geo = new THREE.SphereGeometry(2, 64, 64)
    const mat = new THREE.MeshPhongMaterial({ map: earthMap, specular: new THREE.Color('#111111'), shininess: 10 })
    const globe = new THREE.Mesh(geo, mat)
    scene.add(globe)

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
    gsap.to(globe.position, { x: 1.5, scrollTrigger: { trigger: '#hero', start: 'bottom center', end: 'center center', scrub: 1.5 } })
    const footerTL = gsap.timeline({
      scrollTrigger: { trigger: '#footer', start: 'top bottom', end: 'bottom top', scrub: 3, invalidateOnRefresh: true },
    })
    footerTL.to(globe.position, { x: 0, ease: 'power2.inOut', duration: 2 }).to(globe.scale, { x: 2.5, y: 2.5, z: 2.5, ease: 'power2.out', duration: 1.5 }, '-=0.5').to(camera.position, { z: 2.8, ease: 'power2.out', duration: 1.5 }, '-=1.5')

    gsap.from('.stat-card', { opacity: 0, x: -50, duration: 1, stagger: 0.1, scrollTrigger: { trigger: '#details', start: 'top center' } })
    gsap.from('.join-card', { opacity: 0, y: 80, duration: 1.2, stagger: 0.3, force3D: true, scrollTrigger: { trigger: '.join-section', start: 'top 75%', toggleActions: 'play none none none' } })
    gsap.from('.portal-card', { opacity: 0, y: 60, duration: 1, stagger: 0.1, force3D: true, scrollTrigger: { trigger: '#grants-portal', start: 'top 75%', toggleActions: 'play none none none' } })

    const animate = () => {
      rafId = requestAnimationFrame(animate)
      globe.rotation.y += 0.001
      scene.rotation.y += (mouseX - scene.rotation.y) * 0.05
      scene.rotation.x += (mouseY - scene.rotation.x) * 0.05
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
      renderer.dispose()
    }

    resolveReady?.()
  }

  onBeforeUnmount(() => cleanup?.())

  return { init, ready }
}
