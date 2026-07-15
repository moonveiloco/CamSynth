import { CONFIG } from './config.js'

export class AudioEngine {
  constructor() {
    this.ctx = null
    this.workletNode = null
    this.masterGain = null
    this.initialized = false
  }

  async init() {
    this.ctx = new AudioContext()

    await this.ctx.audioWorklet.addModule('js/terrain-processor.js')

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

    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = s.volume

    this.workletNode.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)

    this.initialized = true
  }

  setParam(name, value) {
    if (!this.initialized) return
    this.workletNode.parameters.get(name).setValueAtTime(value, this.ctx.currentTime)
  }

  sendTerrain(heights, hues, cols, rows, span) {
    if (!this.initialized) return
    this.workletNode.port.postMessage({
      type: 'terrain',
      heights: new Float32Array(heights),
      hues: new Float32Array(hues),
      cols, rows, span,
    })
  }

  getPhase() {
    if (!this.initialized) return 0
    return performance.now() / 1000 * CONFIG.synth.frequency * Math.PI * 2
  }
}
