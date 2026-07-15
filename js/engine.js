// ============================================================
// engine.js — Main audio engine (AudioContext + Worklet)
// ============================================================
// Manages the audio lifecycle: creates the AudioContext, loads
// the AudioWorkletProcessor in a separate thread, routes the
// signal, and communicates grid data via MessagePort.

import { CONFIG } from './config.js'

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.workletNode = null       // AudioWorkletNode for real-time DSP
    this.masterGain = null        // Master volume node
    this.initialized = false
  }

  // Initializes the audio context, loads the worklet, and connects nodes
  async init() {
    this.ctx = new AudioContext()

    // Loads the DSP processor into a separate audio thread
    await this.ctx.audioWorklet.addModule('js/terrain-processor.js')

    // Creates the worklet node with initial parameter values
    const s = CONFIG.synth
    this.workletNode = new AudioWorkletNode(this.ctx, 'cam-terrain-processor', {
      parameterData: {
        frequency: s.frequency,
        radius: s.radius,
        cx: s.cx,
        cz: s.cz,
        fmInt: s.fmInt,
        fmRatio: s.fmRatio,
        yScale: s.yScale,
        hueAmount: s.hueAmount,
      },
    })

    // Chain: worklet → masterGain → destination (speakers/headphones)
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = s.volume

    this.workletNode.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)

    this.initialized = true
  }

  // Updates an audio parameter in real time
  setParam(name, value) {
    if (!this.initialized) return
    this.workletNode.parameters.get(name).setValueAtTime(value, this.ctx.currentTime)
  }

  // Sends terrain data to the audio thread via MessagePort
  // The Float32Array is copied to avoid race conditions
  sendTerrain(heights, hues, cols, rows, span) {
    if (!this.initialized) return
    this.workletNode.port.postMessage({
      type: 'terrain',
      heights: new Float32Array(heights),
      hues: new Float32Array(hues),
      cols, rows, span,
    })
  }

  // Computes the current carrier phase for synchronization
  // with the 3D orbit visualization
  getPhase() {
    if (!this.initialized) return 0
    return performance.now() / 1000 * CONFIG.synth.frequency * Math.PI * 2
  }
}
