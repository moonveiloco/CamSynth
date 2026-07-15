// ============================================================
// terrain-processor.js — AudioWorkletProcessor (real-time DSP)
// ============================================================
// Polyphonic wave-terrain synthesis engine. Runs in a separate
// audio thread (AudioWorklet) with real-time priority.
//
// Two modes:
//   webcam — single carrier orbiting at CONFIG.synth.frequency
//   midi   — polyphonic voices, each orbit determined by MIDI note
//
// Algorithm:
// 1. Receives the height/hue grid from the main thread
// 2. For each active voice: computes a circular orbit over the
//    terrain, samples with bilinear interpolation, applies FM
// 3. Sums all voices and normalizes output

import { bilinearInterp } from './sampler.js'

const MAX_VOICES = 8
const MIDI_A4 = 69
const A4_FREQ = 440

function midiToFreq(note) {
  return A4_FREQ * Math.pow(2, (note - MIDI_A4) / 12)
}

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
    this._voiceAge = 0

    this.voices = []
    for (let i = 0; i < MAX_VOICES; i++) {
      this.voices.push({
        active: false,
        note: 60,
        freq: 261.63,
        velocity: 0.8,
        phase: 0,
        modPhase: 0,
        birth: 0,
      })
    }

    this.mode = 0

    this.pendingHeights = null
    this.pendingHues = null
    this.pendingCols = 32
    this.pendingRows = 24
    this.pendingSpan = 20
    this.pending = false

    this.port.onmessage = (e) => this._onMessage(e)
  }

  _onMessage(e) {
    const { type } = e.data
    switch (type) {
      case 'terrain':
        this.pendingHeights = e.data.heights
        this.pendingHues = e.data.hues
        this.pendingCols = e.data.cols
        this.pendingRows = e.data.rows
        this.pendingSpan = e.data.span
        this.pending = true
        break
      case 'noteon':
        this._noteOn(e.data.note, e.data.velocity ?? 0.8)
        break
      case 'noteoff':
        if (e.data.note < 0) {
          this._allNotesOff()
        } else {
          this._noteOff(e.data.note)
        }
        break
      case 'allnotesoff':
        this._allNotesOff()
        break
      case 'mode':
        this.mode = e.data.mode === 'midi' ? 1 : 0
        if (this.mode === 0) this._allNotesOff()
        break
    }
  }

  _noteOn(note, vel) {
    const v = this._allocVoice()
    v.active = true
    v.note = note
    v.freq = midiToFreq(note)
    v.velocity = Math.max(0, Math.min(1, vel))
    v.phase = 0
    v.modPhase = 0
  }

  _noteOff(note) {
    for (const v of this.voices) {
      if (v.active && v.note === note) {
        v.active = false
      }
    }
  }

  _allNotesOff() {
    for (const v of this.voices) v.active = false
  }

  _allocVoice() {
    let oldestIdx = 0
    let oldestBirth = Infinity
    for (let i = 0; i < MAX_VOICES; i++) {
      if (!this.voices[i].active) {
        this.voices[i].birth = this._voiceAge++
        return this.voices[i]
      }
      if (this.voices[i].birth < oldestBirth) {
        oldestBirth = this.voices[i].birth
        oldestIdx = i
      }
    }
    this.voices[oldestIdx].birth = this._voiceAge++
    return this.voices[oldestIdx]
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

    if (this.mode === 0) {
      this._processWebcam(n, left, right, parameters)
    } else {
      this._ProcessMidi(n, left, right, parameters)
    }

    return true
  }

  _processWebcam(n, left, right, parameters) {
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
  }

  _ProcessMidi(n, left, right, parameters) {
    const heights = this.heights
    const hues = this.hues
    const cols = this.cols
    const rows = this.rows
    const halfSpan = this.span / 2
    const sr = sampleRate
    const twoPi = 2 * Math.PI

    for (let i = 0; i < n; i++) {
      const radius = parameters.radius.length > 1 ? parameters.radius[i] : parameters.radius[0]
      const cx = parameters.cx.length > 1 ? parameters.cx[i] : parameters.cx[0]
      const cz = parameters.cz.length > 1 ? parameters.cz[i] : parameters.cz[0]
      const fmInt = parameters.fmInt.length > 1 ? parameters.fmInt[i] : parameters.fmInt[0]
      const fmRatio = parameters.fmRatio.length > 1 ? parameters.fmRatio[i] : parameters.fmRatio[0]
      const yScale = parameters.yScale.length > 1 ? parameters.yScale[i] : parameters.yScale[0]
      const hueAmount = parameters.hueAmount.length > 1 ? parameters.hueAmount[i] : parameters.hueAmount[0]

      let sample = 0
      let count = 0

      for (const voice of this.voices) {
        if (!voice.active) continue

        const ox = cx + radius * Math.cos(voice.phase)
        const oz = cz + radius * Math.sin(voice.phase)

        const gx = ((ox / halfSpan) + 1) * 0.5 * (cols - 1)
        const gy = ((oz / halfSpan) + 1) * 0.5 * (rows - 1)

        let height = 0
        let hue = 0
        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
          height = bilinearInterp(heights, cols, rows, gx, gy)
          hue = bilinearInterp(hues, cols, rows, gx, gy)
        }

        const localFmInt = Math.max(0, fmInt + hue * hueAmount * 200)

        let targetFreq = voice.freq
        if (localFmInt > 0.001) {
          const modFreq = voice.freq * fmRatio
          voice.modPhase = (voice.modPhase + twoPi * modFreq / sr) % twoPi
          targetFreq = voice.freq + Math.sin(voice.modPhase) * localFmInt
        }

        voice.phase = (voice.phase + twoPi * targetFreq / sr) % twoPi

        const voiceSample = Math.max(-1, Math.min(1, height * yScale * 0.3))
        sample += voiceSample * voice.velocity
        count++
      }

      if (count > 1) {
        sample /= Math.sqrt(count)
      }
      sample = Math.max(-1, Math.min(1, sample))
      left[i] = sample
      if (right) right[i] = sample
    }
  }
}

registerProcessor('cam-terrain-processor', CamTerrainProcessor)
