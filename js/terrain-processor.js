import { bilinearInterp } from './sampler.js'

class CamTerrainProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.heights = new Float32Array(768)
    this.hues = new Float32Array(768)
    this.rows = 24
    this.cols = 32
    this.span = 20
    this.phase = 0
    this.modPhase = 0
    this.pendingHeights = null
    this.pendingHues = null
    this.pendingCols = 32
    this.pendingRows = 24
    this.pendingSpan = 20
    this.pending = false

    this.port.onmessage = (e) => {
      if (e.data.type === 'terrain') {
        this.pendingHeights = e.data.heights
        this.pendingHues = e.data.hues
        this.pendingCols = e.data.cols
        this.pendingRows = e.data.rows
        this.pendingSpan = e.data.span
        this.pending = true
      }
    }
  }

  static get parameterDescriptors() {
    return [
      ['frequency', 110, 20, 2000],
      ['radius', 2.0, 0.1, 8.0],
      ['cx', 0, -100, 100],
      ['cz', 0, -100, 100],
      ['fmInt', 0, 0, 500],
      ['fmRatio', 2.0, -1, 6],
      ['yScale', 1.0, 0.1, 5.0],
      ['hueAmount', 0.3, 0, 1.0],
    ].map(([name, def, min, max]) => ({
      name, defaultValue: def, minValue: min, maxValue: max,
    }))
  }

  process(inputs, outputs, parameters) {
    const left = outputs[0][0]
    const right = outputs[0][1]
    if (!left) return true
    const n = left.length

    if (this.pending) {
      this.heights = this.pendingHeights
      this.hues = this.pendingHues
      this.cols = this.pendingCols
      this.rows = this.pendingRows
      this.span = this.pendingSpan
      this.pending = false
    }

    const heights = this.heights
    const hues = this.hues
    const cols = this.cols
    const rows = this.rows
    const halfSpan = this.span / 2
    const sr = sampleRate
    const twoPi = 2 * Math.PI

    for (let i = 0; i < n; i++) {
      const freq = parameters.frequency.length > 1 ? parameters.frequency[i] : parameters.frequency[0]
      const radius = parameters.radius.length > 1 ? parameters.radius[i] : parameters.radius[0]
      const cx = parameters.cx.length > 1 ? parameters.cx[i] : parameters.cx[0]
      const cz = parameters.cz.length > 1 ? parameters.cz[i] : parameters.cz[0]
      const fmInt = parameters.fmInt.length > 1 ? parameters.fmInt[i] : parameters.fmInt[0]
      const fmRatio = parameters.fmRatio.length > 1 ? parameters.fmRatio[i] : parameters.fmRatio[0]
      const yScale = parameters.yScale.length > 1 ? parameters.yScale[i] : parameters.yScale[0]
      const hueAmount = parameters.hueAmount.length > 1 ? parameters.hueAmount[i] : parameters.hueAmount[0]

      const ox = cx + radius * Math.cos(this.phase)
      const oz = cz + radius * Math.sin(this.phase)

      const gx = ((ox / halfSpan) + 1) * 0.5 * (cols - 1)
      const gy = ((oz / halfSpan) + 1) * 0.5 * (rows - 1)

      let height = 0
      let hue = 0
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        height = bilinearInterp(heights, cols, rows, gx, gy)
        hue = bilinearInterp(hues, cols, rows, gx, gy)
      }

      const localFmInt = Math.max(0, fmInt + hue * hueAmount * 200)

      let targetFreq = freq
      if (localFmInt > 0.001) {
        const modFreq = freq * fmRatio
        this.modPhase = (this.modPhase + twoPi * modFreq / sr) % twoPi
        targetFreq = freq + Math.sin(this.modPhase) * localFmInt
      }

      this.phase = (this.phase + twoPi * targetFreq / sr) % twoPi

      const sample = Math.max(-1, Math.min(1, height * yScale * 0.3))
      left[i] = sample
      if (right) right[i] = sample
    }

    return true
  }
}

registerProcessor('cam-terrain-processor', CamTerrainProcessor)
