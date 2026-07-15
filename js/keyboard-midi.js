// ============================================================
// keyboard-midi.js — Unified keyboard + WebMIDI controller
// ============================================================
// Maps PC keyboard keys to MIDI notes (see keymap-midi-ableton.md)
// and provides WebMIDI input routing. Emits note-on/note-off
// events that the AudioEngine forwards to the worklet processor.
//
// Keyboard layout:
//   Bottom row (white keys): A=C4, S=D4, D=E4, F=F4, G=G4, H=A4, J=B4
//   Top row  (black keys):  W=C#4, E=D#4, T=F#4, Y=G#4, U=A#4
//   Upper octave:           K=C5, O=C#5, L=D5
//   Controls:               Z=octave down, X=octave up,
//                           C=velocity down, V=velocity up
// ============================================================

const KEY_TO_NOTE = {
  'a': 60,  // C4
  'w': 61,  // C#4
  's': 62,  // D4
  'e': 63,  // D#4
  'd': 64,  // E4
  'f': 65,  // F4
  't': 66,  // F#4
  'g': 67,  // G4
  'y': 68,  // G#4
  'h': 69,  // A4
  'u': 70,  // A#4
  'j': 71,  // B4
  'k': 72,  // C5
  'o': 73,  // C#5
  'l': 74,  // D5
}

export class MidiController {
  constructor() {
    this.onNoteOn = null
    this.onNoteOff = null

    this.octaveShift = 0
    this.velocity = 100
    this.keyboardEnabled = true

    this.midiAccess = null
    this._midiInputs = new Map()
    this._activeMidiInput = null
    this._activeKeys = new Map()
    this._boundOnKeyDown = this._onKeyDown.bind(this)
    this._boundOnKeyUp = this._onKeyUp.bind(this)
  }

  async init() {
    try {
      this.midiAccess = await navigator.requestMIDIAccess()
      this._midiInputs = new Map()
      this.midiAccess.inputs.forEach((input) => {
        this._midiInputs.set(input.id, input)
      })
      this.midiAccess.onstatechange = () => {
        const prev = this._midiInputs
        this._midiInputs = new Map()
        this.midiAccess.inputs.forEach((input) => {
          this._midiInputs.set(input.id, input)
          if (this._activeMidiInput === input.id) {
            input.onmidimessage = this._onMidiMessage.bind(this)
          }
        })
        this._emitDeviceList()
      }
      this._emitDeviceList()
    } catch (e) {
      console.warn('WebMIDI not available:', e.message)
    }

    document.addEventListener('keydown', this._boundOnKeyDown)
    document.addEventListener('keyup', this._boundOnKeyUp)
  }

  getDeviceList() {
    const list = []
    this._midiInputs.forEach((input) => {
      list.push({ id: input.id, name: input.name || 'Unknown' })
    })
    return list
  }

  selectDevice(id) {
    this._midiInputs.forEach((input) => {
      input.onmidimessage = null
    })
    this._activeMidiInput = id || null
    if (id) {
      const input = this._midiInputs.get(id)
      if (input) {
        input.onmidimessage = this._onMidiMessage.bind(this)
      }
    }
  }

  setKeyboardEnabled(enabled) {
    this.keyboardEnabled = enabled
    if (!enabled) {
      this._activeKeys.forEach((note) => this.onNoteOff?.(note))
      this._activeKeys.clear()
    }
  }

  allNotesOff() {
    this._activeKeys.forEach((note) => this.onNoteOff?.(note))
    this._activeKeys.clear()
    this.onNoteOff?.(-1)
  }

  destroy() {
    document.removeEventListener('keydown', this._boundOnKeyDown)
    document.removeEventListener('keyup', this._boundOnKeyUp)
    this._midiInputs.forEach((input) => { input.onmidimessage = null })
  }

  _onMidiMessage(e) {
    const [status, note, velocity] = e.data
    const type = status & 0xf0
    if (type === 0x90 && velocity > 0) {
      this.onNoteOn?.(note, velocity / 127)
    } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
      this.onNoteOff?.(note)
    }
  }

  _onKeyDown(e) {
    if (!this.keyboardEnabled || e.repeat) return
    const key = e.key.toLowerCase()

    if (key === 'z') { this.octaveShift = Math.max(-2, this.octaveShift - 1); return }
    if (key === 'x') { this.octaveShift = Math.min(2, this.octaveShift + 1); return }
    if (key === 'c') { this.velocity = Math.max(1, this.velocity - 10); return }
    if (key === 'v') { this.velocity = Math.min(127, this.velocity + 10); return }

    const baseNote = KEY_TO_NOTE[key]
    if (baseNote !== undefined && !this._activeKeys.has(key)) {
      const midiNote = baseNote + this.octaveShift * 12
      this._activeKeys.set(key, midiNote)
      this.onNoteOn?.(midiNote, this.velocity / 127)
    }
  }

  _onKeyUp(e) {
    if (!this.keyboardEnabled) return
    const key = e.key.toLowerCase()
    if (this._activeKeys.has(key)) {
      const midiNote = this._activeKeys.get(key)
      this._activeKeys.delete(key)
      this.onNoteOff?.(midiNote)
    }
  }

  _emitDeviceList() {
    const list = this.getDeviceList()
    const detail = { devices: list }
    window.dispatchEvent(new CustomEvent('mididevicelist', { detail }))
  }
}
