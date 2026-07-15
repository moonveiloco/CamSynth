// ============================================================
// main.js — Application entry point
// ============================================================
// Coordinates the initialization of audio, webcam, and 3D scene.
// Connects UI controls to the various modules and manages the
// main capture and rendering loop.

import { CONFIG, LIMITS } from './config.js'
import { GridCapture } from './grid.js'
import { AudioEngine } from './engine.js'
import { Scene3D } from './render/scene.js'

let engine = null
let grid = null
let scene = null
let captureTimer = null

// ============================================================
// Startup — START button
// ============================================================
document.getElementById('start-btn').addEventListener('click', async () => {
  // Hides overlay, shows controls
  document.getElementById('overlay').classList.add('hidden')
  document.getElementById('controls').classList.remove('hidden')

  try {
    // Initializes audio chain (AudioContext + AudioWorklet)
    engine = new AudioEngine()
    await engine.init()

    // Starts webcam capture
    grid = new GridCapture()
    await grid.start()

    // Initializes Three.js scene with video texture
    const canvas = document.getElementById('canvas3d')
    scene = new Scene3D(canvas)
    scene.updateTexture(grid.video)

    // First immediate capture, then cyclic
    doCapture()
    captureTimer = setInterval(doCapture, CONFIG.updateInterval)

    // Starts the 3D rendering loop
    animate()

    // Binds UI events
    bindControls()
    bindAutoRotate()
    bindUpdateInterval()
  } catch (err) {
    alert('Errore: ' + err.message)
    location.reload()
  }
})

// ============================================================
// Capture loop — samples webcam and sends to engines
// ============================================================
function doCapture() {
  if (!grid || !grid.capture()) return
  const { heights, hues } = grid.getGrid()
  // Sends the grid to the audio processor (separate thread)
  engine.sendTerrain(heights, hues, CONFIG.cols, CONFIG.rows, CONFIG.span)
  // Updates the 3D terrain mesh
  scene.updateTerrain(heights)
  updateOrbit(heights)
}

// Updates the orbit ring and cursor position
function updateOrbit(heights) {
  const s = CONFIG.synth
  const phase = engine.getPhase()
  scene.updateOrbit(s.cx, s.cz, s.radius, phase, heights)
}

// ============================================================
// 3D rendering loop (60fps via requestAnimationFrame)
// ============================================================
function animate() {
  requestAnimationFrame(animate)
  updateOrbit(grid ? grid.getGrid().heights : null)
  scene.render()
}

// ============================================================
// UI Controls
// ============================================================

// Grid update interval (in seconds)
function bindUpdateInterval() {
  const el = document.getElementById('updateint')
  const valEl = document.getElementById('updateint-val')
  el.addEventListener('input', () => {
    const v = parseFloat(el.value)
    CONFIG.updateInterval = v * 1000
    if (valEl) valEl.textContent = v
    clearInterval(captureTimer)
    captureTimer = setInterval(doCapture, CONFIG.updateInterval)
  })
}

// Auto-rotate toggle for the 3D camera
function bindAutoRotate() {
  const el = document.getElementById('autorotate')
  const valEl = document.getElementById('autorotate-val')
  el.addEventListener('change', () => {
    const on = el.checked
    scene.controls.autoRotate = on
    if (valEl) valEl.textContent = on ? 'on' : 'off'
  })
}

// Maps slider controls to audio parameters and config
function bindControls() {
  const bindings = [
    { id: 'freq', param: 'frequency', key: 'frequency' },
    { id: 'radius', param: 'radius', key: 'radius' },
    { id: 'yscale', param: 'yScale', key: 'yScale' },
    { id: 'fmint', param: 'fmInt', key: 'fmInt' },
    { id: 'fmratio', param: 'fmRatio', key: 'fmRatio' },
    { id: 'hueamt', param: 'hueAmount', key: 'hueAmount' },
  ]

  for (const b of bindings) {
    const el = document.getElementById(b.id)
    const valEl = document.getElementById(b.id + '-val')
    if (!el) continue

    el.addEventListener('input', () => {
      const v = parseFloat(el.value)
      CONFIG.synth[b.key] = v        // Updates config
      if (valEl) valEl.textContent = v
      engine.setParam(b.param, v)    // Sends to DSP in real time
    })
  }
}
