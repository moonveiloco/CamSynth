// ============================================================
// scene.js — Three.js 3D scene
// ============================================================
// Manages the three-dimensional wave-terrain visualization:
// - Deformable terrain textured with the webcam feed
// - Orbit ring showing the sampling path
// - Red cursor following the current audio phase
// - Camera with orbit controls + auto-rotate

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TerrainMesh } from './terrain-mesh.js'
import { CONFIG } from '../config.js'

export class Scene3D {
  constructor(canvas) {
    this.cols = CONFIG.cols
    this.rows = CONFIG.rows
    this.span = CONFIG.span

    // ============================================================
    // Scene
    // ============================================================
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a12)  // Dark background

    // ============================================================
    // Perspective camera
    // ============================================================
    this.camera = new THREE.PerspectiveCamera(
      45, canvas.clientWidth / canvas.clientHeight, 0.1, 100
    )
    this.camera.position.set(CONFIG.view.distance * 0.7, CONFIG.view.distance * 0.5, CONFIG.view.distance * 0.7)
    this.camera.lookAt(0, 0, 0)

    // ============================================================
    // WebGL renderer
    // ============================================================
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // ============================================================
    // Orbit controls (drag to rotate, scroll to zoom)
    // ============================================================
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.target.set(0, 0, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.autoRotate = true       // Auto-rotate initially on
    this.controls.autoRotateSpeed = 1.0
    this.controls.update()

    // ============================================================
    // Lights
    // ============================================================
    const ambient = new THREE.AmbientLight(0x404060, 0.5)  // Soft ambient light
    this.scene.add(ambient)

    const dir = new THREE.DirectionalLight(0xffffff, 1.5)  // Main directional light
    dir.position.set(0, 15, 8)
    this.scene.add(dir)

    const fill = new THREE.DirectionalLight(0x4488ff, 0.3)  // Blue fill light
    fill.position.set(-5, 3, -5)
    this.scene.add(fill)

    // ============================================================
    // Terrain mesh
    // ============================================================
    this.terrain = new TerrainMesh(this.cols, this.rows, this.span)
    this.scene.add(this.terrain.mesh)

    // ============================================================
    // Orbit ring — shows the sampling path
    // ============================================================
    const orbitGeo = new THREE.BufferGeometry()
    const orbitPos = new Float32Array((65) * 3)
    orbitGeo.setAttribute('position', new THREE.Float32BufferAttribute(orbitPos, 3))
    this.orbitRing = new THREE.LineLoop(
      orbitGeo,
      new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 })  // Semi-transparent cyan
    )
    this.scene.add(this.orbitRing)

    // ============================================================
    // Cursor — red dot following the audio phase
    // ============================================================
    this.cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4466 })   // Red/pink
    )
    this.scene.add(this.cursor)

    // Window resize handler
    window.addEventListener('resize', () => this.resize())
  }

  // Updates terrain mesh heights
  updateTerrain(heights) {
    this.terrain.updateHeights(heights, this.cols, this.rows)
  }

  // Applies webcam video as terrain texture
  updateTexture(video) {
    this.terrain.updateTexture(video)
  }

  // Updates orbit ring and cursor based on audio phase
  updateOrbit(cx, cz, radius, phase, heights) {
    const halfSpan = this.span / 2
    const cols = this.cols
    const rows = this.rows
    const seg = 64

    // Computes ring vertices (64 segments + closure)
    const pos = this.orbitRing.geometry.attributes.position.array
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2
      const ox = cx + radius * Math.cos(a)
      const oz = cz + radius * Math.sin(a)

      // Maps world coordinates → grid coordinates for height lookup
      const gx = ((ox / halfSpan) + 1) * 0.5 * (cols - 1)
      const gy = ((oz / halfSpan) + 1) * 0.5 * (rows - 1)

      let h = 0.05
      if (heights && gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        const ix = Math.floor(gx)
        const iy = Math.floor(gy)
        h = heights[iy * cols + ix] * 3 + 0.05  // *3 for visual amplification
      }

      pos[i * 3] = ox
      pos[i * 3 + 1] = h
      pos[i * 3 + 2] = oz
    }
    this.orbitRing.geometry.attributes.position.needsUpdate = true

    // Positions the red cursor on the current phase
    const ox = cx + radius * Math.cos(phase)
    const oz = cz + radius * Math.sin(phase)
    const cgx = ((ox / halfSpan) + 1) * 0.5 * (cols - 1)
    const cgy = ((oz / halfSpan) + 1) * 0.5 * (rows - 1)
    let ch = 0.1
    if (heights && cgx >= 0 && cgx < cols && cgy >= 0 && cgy < rows) {
      const cix = Math.floor(cgx)
      const ciy = Math.floor(cgy)
      ch = heights[ciy * cols + cix] * 3 + 0.1
    }
    this.cursor.position.set(ox, ch, oz)
  }

  // Renders a frame (called by requestAnimationFrame)
  render() {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  // Handles window resize
  resize() {
    const c = this.renderer.domElement
    const w = c.clientWidth
    const h = c.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }
}
