import { CONFIG, LIMITS } from './config.js'
import { GridCapture } from './grid.js'
import { AudioEngine } from './engine.js'
import { Scene3D } from './render/scene.js'

let engine = null
let grid = null
let scene = null
let captureTimer = null

document.getElementById('start-btn').addEventListener('click', async () => {
  document.getElementById('overlay').classList.add('hidden')
  document.getElementById('controls').classList.remove('hidden')

  try {
    engine = new AudioEngine()
    await engine.init()

    grid = new GridCapture()
    await grid.start()

    const canvas = document.getElementById('canvas3d')
    scene = new Scene3D(canvas)
    scene.updateTexture(grid.video)

    doCapture()
    captureTimer = setInterval(doCapture, CONFIG.updateInterval)

    animate()

    bindControls()
    bindAutoRotate()
    bindUpdateInterval()
  } catch (err) {
    alert('Errore: ' + err.message)
    location.reload()
  }
})

function doCapture() {
  if (!grid || !grid.capture()) return
  const { heights, hues } = grid.getGrid()
  engine.sendTerrain(heights, hues, CONFIG.cols, CONFIG.rows, CONFIG.span)
  scene.updateTerrain(heights)
  updateOrbit(heights)
}

function updateOrbit(heights) {
  const s = CONFIG.synth
  const phase = engine.getPhase()
  scene.updateOrbit(s.cx, s.cz, s.radius, phase, heights)
}

function animate() {
  requestAnimationFrame(animate)
  updateOrbit(grid ? grid.getGrid().heights : null)
  scene.render()
}

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

function bindAutoRotate() {
  const el = document.getElementById('autorotate')
  const valEl = document.getElementById('autorotate-val')
  el.addEventListener('change', () => {
    const on = el.checked
    scene.controls.autoRotate = on
    if (valEl) valEl.textContent = on ? 'on' : 'off'
  })
}

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
      CONFIG.synth[b.key] = v
      if (valEl) valEl.textContent = v
      engine.setParam(b.param, v)
    })
  }
}
