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
    this.workletNode = null
    this.masterGain = null
    this.destNode = null
    this.mediaRecorder = null
    this.recordingChunks = []
    this.recording = false
    this.initialized = false
    this.onRecordingComplete = null
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

    this.destNode = this.ctx.createMediaStreamDestination()

    this.workletNode.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)
    this.masterGain.connect(this.destNode)

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

  // Sends a note-on event to the audio processor
  noteOn(note, velocity) {
    if (!this.initialized) return
    this.workletNode.port.postMessage({ type: 'noteon', note, velocity })
  }

  // Sends a note-off event to the audio processor
  noteOff(note) {
    if (!this.initialized) return
    this.workletNode.port.postMessage({ type: 'noteoff', note })
  }

  // Kills all active voices
  allNotesOff() {
    if (!this.initialized) return
    this.workletNode.port.postMessage({ type: 'allnotesoff' })
  }

  // Switches between webcam and midi mode
  sendMode(mode) {
    if (!this.initialized) return
    this.workletNode.port.postMessage({ type: 'mode', mode })
    CONFIG.synth.mode = mode
  }

  getPhase() {
    if (!this.initialized) return 0
    return performance.now() / 1000 * CONFIG.synth.frequency * Math.PI * 2
  }

  startRecording() {
    if (!this.initialized || this.recording) return
    this.recordingChunks = []

    let mimeType
    if (MediaRecorder.isTypeSupported('audio/mpeg')) {
      mimeType = 'audio/mpeg'
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm'
    } else {
      mimeType = ''
    }

    const options = mimeType ? { mimeType } : {}
    this.mediaRecorder = new MediaRecorder(this.destNode.stream, options)
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordingChunks.push(e.data)
    }
    this.mediaRecorder.onerror = (e) => {
      console.warn('MediaRecorder error:', e.error || e)
    }
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordingChunks, { type: this.mediaRecorder.mimeType })
      this.recordingChunks = []
      if (this.mediaRecorder.mimeType === 'audio/mpeg') {
        this.recording = false
        if (this.onRecordingComplete) this.onRecordingComplete(blob)
      } else {
        this._convertToMp3(blob)
      }
    }
    this.mediaRecorder.start(1000)
    this.recording = true
  }

  stopRecording() {
    if (!this.initialized || !this.recording || !this.mediaRecorder) return
    if (this.mediaRecorder.state === 'recording') {
      try { this.mediaRecorder.stop() } catch (e) { console.warn('MediaRecorder stop error:', e) }
    }
  }

  setBpm(bpm) {
    CONFIG.bpm = bpm
    if (!this.initialized) return
    this.workletNode.port.postMessage({ type: 'bpm', bpm })
  }

  setClickEnabled(enabled) {
    CONFIG.clickEnabled = enabled
    if (!this.initialized) return
    this.workletNode.port.postMessage({ type: 'click', enabled })
  }

  async _convertToMp3(blob) {
    try {
      if (typeof lamejs === 'undefined') {
        throw new Error('lamejs not loaded')
      }

      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)

      const channels = 1
      const sampleRate = audioBuffer.sampleRate
      const pcmData = audioBuffer.getChannelData(0)

      const samples = new Int16Array(pcmData.length)
      for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]))
        samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128)
      const mp3Data = []
      const blockSize = 1152

      for (let i = 0; i < samples.length; i += blockSize) {
        const chunk = samples.subarray(i, i + blockSize)
        const mp3Buf = encoder.encodeBuffer(chunk)
        if (mp3Buf.length > 0) mp3Data.push(mp3Buf)
      }

      const mp3Buf = encoder.flush()
      if (mp3Buf.length > 0) mp3Data.push(mp3Buf)

      const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' })
      this.recording = false
      if (this.onRecordingComplete) this.onRecordingComplete(mp3Blob)
    } catch (err) {
      console.warn('MP3 conversion failed, falling back to original format:', err)
      this.recording = false
      if (this.onRecordingComplete) this.onRecordingComplete(blob)
    }
  }
}
